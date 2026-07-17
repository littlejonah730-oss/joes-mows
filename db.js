// db.js — SQLite database setup and schema for Joe's Mows LLC System
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.join(__dirname, "db", "joesmows.db");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  group_name TEXT DEFAULT '',
  address TEXT DEFAULT '',
  frequency TEXT DEFAULT 'weekly',      -- weekly | biweekly | one-time | monthly
  day TEXT DEFAULT '',                  -- e.g. Monday
  bagged INTEGER DEFAULT 0,             -- 0/1
  phone TEXT DEFAULT '',
  avg_time INTEGER DEFAULT 0,           -- minutes
  price REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,                   -- YYYY-MM-DD
  weekday TEXT DEFAULT '',
  client_id INTEGER NOT NULL,
  description TEXT DEFAULT '',
  charge REAL DEFAULT 0,
  paid INTEGER DEFAULT 0,               -- 0 = No, 1 = Yes
  payment_method TEXT DEFAULT '',       -- cash | venmo | check | ''
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// Seed default settings (worker pay rate, hire milestone) if not present
const defaultSettings = {
  worker_pay_mode: "per_job",      // "per_job" or "per_yard" (same thing here, kept flexible)
  worker_rate: "12",               // flat $ per completed/paid job
  hire_milestone: "25"             // number of weekly+biweekly clients that triggers "time to hire" banner
};

const insertSetting = db.prepare(
  "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
);
for (const [k, v] of Object.entries(defaultSettings)) {
  insertSetting.run(k, v);
}

module.exports = db;
