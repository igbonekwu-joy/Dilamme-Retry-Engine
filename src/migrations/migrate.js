import winston from "winston";
import db from "../config/client.js";
import logger from "../config/logger.js";
import { up } from "./init.migration.js";

logger();

db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
        name TEXT PRIMARY KEY,
        ranAt INTEGER NOT NULL
    )
`);

const migrations = [
    { name: '001_init', run: () => up() }
];

for (const migration of migrations) {
  const alreadyRan = db.prepare('SELECT name FROM migrations WHERE name = ?').get(migration.name);

  if (alreadyRan) {
    winston.info(`Skipping ${migration.name} — already ran`);
    continue;
  }

  winston.info(`Running migration: ${migration.name}`);
  migration.run();
  db.prepare('INSERT INTO migrations (name, ranAt) VALUES (?, ?)').run(migration.name, Date.now());
}

winston.info('Migrations complete');