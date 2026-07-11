const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authenticate, requireRole, ah } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

// List all coaches, with a count of how many athletes each one manages
router.get('/coaches', ah(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.name, u.email, u.active, u.created_at,
           (SELECT COUNT(*) FROM athletes a WHERE a.coach_id = u.id) AS athlete_count
    FROM users u
    WHERE u.role = 'coach'
    ORDER BY u.created_at DESC
  `);
  res.json({ coaches: rows });
}));

// Create a new coach account
router.post('/coaches', ah(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: '姓名、Email、密碼皆為必填' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密碼至少需要 6 個字元' });
  }
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) return res.status(409).json({ error: '此 Email 已被使用' });

  const hash = bcrypt.hashSync(password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, email, hash, 'coach']
  );
  res.status(201).json({ id: rows[0].id, name, email, role: 'coach' });
}));

// Update a coach's name / active status, or reset their password
router.patch('/coaches/:id', ah(async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 AND role = $2', [id, 'coach']);
  const coach = rows[0];
  if (!coach) return res.status(404).json({ error: '找不到此教練帳號' });

  const { name, active, password } = req.body || {};
  if (name !== undefined) {
    await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name, id]);
  }
  if (active !== undefined) {
    await pool.query('UPDATE users SET active = $1 WHERE id = $2', [active ? 1 : 0, id]);
  }
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: '密碼至少需要 6 個字元' });
    const hash = bcrypt.hashSync(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
  }
  res.json({ ok: true });
}));

// Delete a coach account (their athletes and records cascade-delete too — confirm on frontend!)
router.delete('/coaches/:id', ah(async (req, res) => {
  const id = Number(req.params.id);
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1 AND role = $2', [id, 'coach']);
  if (rowCount === 0) return res.status(404).json({ error: '找不到此教練帳號' });
  res.json({ ok: true });
}));

// Simple platform-wide overview for the admin dashboard
router.get('/overview', ah(async (req, res) => {
  const [coaches, athletes, sessions, tests] = await Promise.all([
    pool.query("SELECT COUNT(*) AS c FROM users WHERE role='coach'"),
    pool.query('SELECT COUNT(*) AS c FROM athletes'),
    pool.query('SELECT COUNT(*) AS c FROM resistance_sessions'),
    pool.query('SELECT COUNT(*) AS c FROM test_records'),
  ]);
  res.json({
    coachCount: Number(coaches.rows[0].c),
    athleteCount: Number(athletes.rows[0].c),
    sessionCount: Number(sessions.rows[0].c),
    testCount: Number(tests.rows[0].c),
  });
}));

module.exports = router;
