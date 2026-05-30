import winston from 'winston';
import db from '../config/client.js';
import logger from '../config/logger.js';

logger();

export function up() {
    winston.info('Running migration: init');

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS requests (
        id          TEXT PRIMARY KEY,
        url         TEXT NOT NULL,
        method      TEXT NOT NULL,
        body        TEXT,
        status      TEXT NOT NULL DEFAULT 'pending',
        attemptCount INTEGER NOT NULL DEFAULT 0,
        maxRetries  INTEGER NOT NULL DEFAULT 5,
        backoffMs   INTEGER NOT NULL DEFAULT 1000,
        nextRetryAt INTEGER,
        lastError   TEXT,
        result      TEXT,
        createdAt   INTEGER NOT NULL,
        updatedAt   INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS attempts (
        id          TEXT PRIMARY KEY,
        requestId   TEXT NOT NULL,
        attemptNum  INTEGER NOT NULL,
        status      TEXT NOT NULL,
        statusCode  INTEGER,
        error       TEXT,
        duration    INTEGER,
        createdAt   INTEGER NOT NULL,
        FOREIGN KEY (requestId) REFERENCES requests(id)
        );
    `;
    db.exec(createTableQuery);

    winston.info('Migration completed');
}

export function down() {
    winston.info('Rolling back migration: init');

    db.exec(`
        DROP TABLE IF EXISTS attempts;
        DROP TABLE IF EXISTS requests;
    `);

    winston.info('Rollback completed');
}