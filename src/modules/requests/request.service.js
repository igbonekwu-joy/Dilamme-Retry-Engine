import { v4 as uuidv4 } from 'uuid';
import db from '../../config/client.js';
import { StatusCodes } from 'http-status-codes';

export const storeRequest = async (req, res) => {
    const { url, method, body, maxRetries = 5, backoffMs = 1000 } = req.body;
    console.log(body);

    if (!url || !method) {
        return { statusCode: StatusCodes.BAD_REQUEST, error: 'url and method are required' };
    }

    const id = uuidv4();
    const now = Date.now();

    db.prepare(`
    INSERT INTO requests
      (id, url, method, body, status, attemptCount, maxRetries, backoffMs, nextRetryAt, createdAt, updatedAt)
    VALUES
      (@id, @url, @method, @body, 'pending', 0, @maxRetries, @backoffMs, @nextRetryAt, @now, @now)
    `).run({
        id,
        url,
        method: method.toUpperCase(),
        body: body ? JSON.stringify(body) : null, 
        maxRetries,
        backoffMs,
        nextRetryAt: now,   // due immediately — worker can pick it up right away
        now
    });

    return { statusCode: StatusCodes.ACCEPTED, status: 'processing', requestId: id };
}