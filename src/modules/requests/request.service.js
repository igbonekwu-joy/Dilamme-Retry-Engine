import { v4 as uuidv4 } from 'uuid';
import db from '../../config/client.js';
import { StatusCodes } from 'http-status-codes';

export const storeRequest = async (req, res) => {
    const { url, method, body, maxRetries = 5, backoffMs = 1000 } = req.body;

    if (!url || !method) {
        return { 
          statusCode: StatusCodes.BAD_REQUEST, 
          data: { 
            error: 'url and method are required' 
          } 
        };
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
        nextRetryAt: now,   // due immediately 
        now
    });

    return { 
      statusCode: StatusCodes.ACCEPTED, 
      data: { 
        id,
        status: 'pending'
      } 
    };
}

export const fetchRequest = async (id) => {
  const request = db.prepare(`
    SELECT * FROM requests WHERE id = ?
  `).get(id);

  if (!request) {
    return { 
      statusCode: StatusCodes.NOT_FOUND, 
      data: { error: `Request ${id} not found` } 
    };
  }

  const attempts = db.prepare(`
    SELECT * FROM attempts
    WHERE requestId = ?
    ORDER BY attemptNum ASC
  `).all(id);

  const parsedRequest = {
    ...request,
    body: request.body ? JSON.parse(request.body) : null,
    result: request.result ? tryParseJson(request.result) : null,
  };

  return { 
    statusCode: StatusCodes.OK, 
    data: { 
      ...parsedRequest,
      attempts,
    } 
  };
}

export const filterRequestsByStatus = async (status) => {
  const validStatuses = ['pending', 'processing', 'retrying', 'completed', 'failed'];

  if (status && !validStatuses.includes(status)) {
    return { 
      statusCode: StatusCodes.BAD_REQUEST, 
      data: {
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }
    };
  }

  const requests = status
    ? db.prepare(`
        SELECT * FROM requests
        WHERE status = ?
        ORDER BY createdAt DESC
      `).all(status)
    : db.prepare(`
        SELECT * FROM requests
        ORDER BY createdAt DESC
      `).all();

  // parse body and result
  const parsedRequests = requests.map((request) => ({
    ...request,
    body: request.body ? JSON.parse(request.body) : null,
    result: request.result ? tryParseJson(request.result) : null,
  }));

  return { 
    statusCode: StatusCodes.OK, 
    data: {
      total: parsedRequests.length,
      status: status || 'all',
      requests: parsedRequests,
    }
  };
}

function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}