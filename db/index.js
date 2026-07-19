const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const isLocal = !connectionString || connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new Pool(
  connectionString
    ? { connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } }
    : undefined // falls back to standard PG* env vars (PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT)
);

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','coach')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS athletes (
      id SERIAL PRIMARY KEY,
      coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('M','F')),
      event TEXT,
      height REAL,
      weight REAL,
      age INTEGER,
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_athletes_coach ON athletes(coach_id);

    CREATE TABLE IF NOT EXISTS resistance_sessions (
      id SERIAL PRIMARY KEY,
      athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      type TEXT,
      side TEXT,
      resistance TEXT,
      peak REAL, avg REAL, ratio REAL, reps REAL,
      max_speed REAL, avg_speed REAL, accel REAL,
      dist REAL, tot_max_speed REAL, tot_dist REAL,
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_resistance_athlete ON resistance_sessions(athlete_id);

    CREATE TABLE IF NOT EXISTS test_records (
      id SERIAL PRIMARY KEY,
      athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      category TEXT,
      stroke TEXT,
      distance TEXT,
      total_time REAL,
      splits TEXT,
      stroke_rate REAL, stroke_length REAL, breath TEXT,
      vjump REAL, ljump REAL, grip_l REAL, grip_r REAL, flex REAL,
      is_baseline BOOLEAN NOT NULL DEFAULT false,
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_tests_athlete ON test_records(athlete_id);

    -- M6: Fatigue Monitor — subjective RPE, sleep/recovery self-rating, and enough
    -- info (rpe * duration = session load) to compute an ACWR-style acute:chronic ratio.
    CREATE TABLE IF NOT EXISTS fatigue_logs (
      id SERIAL PRIMARY KEY,
      athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      rpe REAL,
      duration_min REAL,
      sleep_quality REAL,
      recovery_feeling REAL,
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_fatigue_athlete ON fatigue_logs(athlete_id);

    -- M8: Coach Prescription — free-text prescriptions written by the coach.
    -- System-generated alerts (e.g. high ACWR) are computed on the fly from
    -- fatigue_logs, not stored here.
    CREATE TABLE IF NOT EXISTS prescriptions (
      id SERIAL PRIMARY KEY,
      athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_prescriptions_athlete ON prescriptions(athlete_id);
  `);
}

module.exports = { pool, initSchema };
