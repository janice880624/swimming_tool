const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---- Schema ----
// users: both admins and coaches live here, distinguished by role.
//   admin  -> can manage coach accounts, sees aggregate info across all coaches.
//   coach  -> can only ever see/edit athletes where athletes.coach_id = users.id.
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','coach')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS athletes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT CHECK(gender IN ('M','F')),
  event TEXT,
  height REAL,
  weight REAL,
  age INTEGER,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_athletes_coach ON athletes(coach_id);

-- Resistance trainer (Land Fitness) session records
CREATE TABLE IF NOT EXISTS resistance_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT,
  side TEXT,
  resistance TEXT,
  peak REAL, avg REAL, ratio REAL, reps REAL,
  max_speed REAL, avg_speed REAL, accel REAL,
  dist REAL, tot_max_speed REAL, tot_dist REAL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_resistance_athlete ON resistance_sessions(athlete_id);

-- Swim coach test records (pool timing / stroke-breath / dryland power)
CREATE TABLE IF NOT EXISTS test_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  category TEXT,
  stroke TEXT,
  distance TEXT,
  total_time REAL,
  splits TEXT,
  stroke_rate REAL, stroke_length REAL, breath TEXT,
  vjump REAL, ljump REAL, grip_l REAL, grip_r REAL, flex REAL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tests_athlete ON test_records(athlete_id);
`);

module.exports = db;
