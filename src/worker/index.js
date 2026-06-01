import { v4 as uuidv4 } from 'uuid';
import db from '../config/client.js';
import winston from 'winston';

const POLL_INTERVAL = 500;

export function startWorker() {
    winston.info('Background Worker started');

    setInterval(async () => {
        await processDueRequests();
    }, POLL_INTERVAL);
}

async function processDueRequests() {
  const now = Date.now();

  // Pick up any job that is pending/retrying and whose nextRetryAt has passed
  const dueRequests = db.prepare(`
    SELECT * FROM requests
    WHERE status IN ('pending', 'retrying')
    AND nextRetryAt <= ?
  `).all(now);

  if (dueRequests.length === 0) return;

  winston.info(`Worker: found ${dueRequests.length} due job(s)`);

  for (const request of dueRequests) {
    const locked = db.prepare(`
      UPDATE requests
      SET status = 'processing', updatedAt = ?
      WHERE id = ? AND status IN ('pending', 'retrying')
    `).run(Date.now(), request.id);

    // another tick already grabbed it, so skip
    if (locked.changes === 0) continue;

    await handleRequest(request);
  }
}

async function handleRequest(request) {
    const startTime = Date.now();
    const attemptNum = request.attemptCount + 1;

    winston.info(`\nProcessing job ${request.id} — attempt #${attemptNum}`);
    winston.info(`→ Calling ${request.method} ${request.url}`);

    let statusCode = null;
    let error = null;
    let result = null;
    let attemptStatus = 'failed';

    try {
        // Build fetch options
        const fetchOptions = {
            method: request.method,
            headers: { 'Content-Type': 'application/json' },
        };

        if (request.body && request.method !== 'GET') {
            fetchOptions.body = request.body; 
        }

        // Make the actual HTTP call
        const response = await fetch(request.url, fetchOptions);
        statusCode = response.status;
        const responseText = await response.text();

        winston.info(`← Response: ${statusCode}`);

        if (response.ok) {
            // ── 2a. Success (2xx)
            result = responseText;
            attemptStatus = 'succeeded';

            db.prepare(`
                UPDATE requests
                SET status       = 'completed',
                    result       = ?,
                    lastError    = NULL,
                    attemptCount = ?,
                    updatedAt    = ?
                WHERE id = ?
            `).run(responseText, attemptNum, Date.now(), request.id);

            winston.info(`✓ Job ${request.id} completed on attempt #${attemptNum}`);

        } else if (statusCode >= 400 && statusCode < 500) {
            // 4xx — terminal, never retry
            error = `HTTP ${statusCode} — not retrying (4xx is terminal)`;
            attemptStatus = 'failed';

            db.prepare(`
                UPDATE requests
                SET status       = 'failed',
                    lastError    = ?,
                    attemptCount = ?,
                    updatedAt    = ?
                WHERE id = ?
            `).run(error, attemptNum, Date.now(), request.id);

            winston.info(`✗ Job ${request.id} permanently failed — ${error}`);

        } else {
            // 5xx — schedule a retry
            error = `HTTP ${statusCode}`;
            attemptStatus = 'failed';

            scheduleRetry(request, attemptNum, error);
        }

    } catch (err) {
        // Network error / timeout
        error = err.message;
        attemptStatus = 'failed';

        winston.info(`✗ Network error: ${error}`);
        scheduleRetry(request, attemptNum, error);
    }

    // Log the attempt
    const duration = Date.now() - startTime;

    db.prepare(`
        INSERT INTO attempts
        (id, requestId, attemptNum, status, statusCode, error, duration, createdAt)
        VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        uuidv4(),
        request.id,
        attemptNum,
        attemptStatus,
        statusCode,
        error,
        duration,
        Date.now()
    );

    winston.info(`Attempt #${attemptNum} logged — duration: ${duration}ms`);
}

// Schedule retry
function scheduleRetry(request, attemptNum, error) {
    // If we've hit the limit — dead-letter it
    if (attemptNum >= request.maxRetries) {
        db.prepare(`
            UPDATE requests
            SET status       = 'failed',
                lastError    = ?,
                attemptCount = ?,
                updatedAt    = ?
            WHERE id = ?
        `).run(error, attemptNum, Date.now(), request.id);

        winston.info(`✗ Job ${request.id} dead-lettered after ${attemptNum} attempts`);
        return;
    }

    // Exponential backoff: backoffMs * 2^(attemptNum - 1)
    // attempt 1 → backoffMs * 1 = 1000ms
    // attempt 2 → backoffMs * 2 = 2000ms
    // attempt 3 → backoffMs * 4 = 4000ms
    const baseWait = request.backoffMs * Math.pow(2, attemptNum - 1);

    // Jitter: random multiplier between 0.8 and 1.2
    const jitter = 0.8 + Math.random() * 0.4;
    const waitMs = Math.round(baseWait * jitter);

    const nextRetryAt = Date.now() + waitMs;

    db.prepare(`
        UPDATE requests
        SET status       = 'retrying',
            lastError    = ?,
            attemptCount = ?,
            nextRetryAt  = ?,
            updatedAt    = ?
        WHERE id = ?
    `).run(error, attemptNum, nextRetryAt, Date.now(), request.id);

  winston.info(`↻ Job ${request.id} retrying in ${waitMs}ms  (base: ${baseWait}ms × jitter: ${jitter.toFixed(3)})`);
}