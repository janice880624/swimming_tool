const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

// List all coaches, with a count of how many athletes each one manages
router.get('/coaches', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.active, u.created_at,
           (SELECT COUNT(*) FROM athletes a WHERE a.coach_id = u.id) AS athlete_count
    FROM users u
    WHERE u.role = 'coach'
    ORDER BY u.created_at DESC
  `).all();
  res.json({ coaches: rows });
});

// Create a new coach account
router.post('/coaches', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: '姓名、Email、密碼皆為必填' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密碼至少需要 6 個字元' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: '此 Email 已被使用' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(name, email, hash, 'coach');
  res.status(201).json({ id: info.lastInsertRowid, name, email, role: 'coach' });
});

// Update a coach's name / active status, or reset their password
router.patch('/coaches/:id', (req, res) => {
  const id = Number(req.params.id);
  const coach = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(id, 'coach');
  if (!coach) return res.status(404).json({ error: '找不到此教練帳號' });

  const { name, active, password } = req.body || {};
  if (name !== undefined) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, id);
  }
  if (active !== undefined) {
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  }
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: '密碼至少需要 6 個字元' });
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  }
  res.json({ ok: true });
});

// Delete a coach account (their athletes and records cascade-delete too — confirm on frontend!)
router.delete('/coaches/:id', (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM users WHERE id = ? AND role = ?').run(id, 'coach');
  if (info.changes === 0) return res.status(404).json({ error: '找不到此教練帳號' });
  res.json({ ok: true });
});

// Simple platform-wide overview for the admin dashboard
router.get('/overview', (req, res) => {
  const coachCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='coach'").get().c;
  const athleteCount = db.prepare('SELECT COUNT(*) AS c FROM athletes').get().c;
  const sessionCount = db.prepare('SELECT COUNT(*) AS c FROM resistance_sessions').get().c;
  const testCount = db.prepare('SELECT COUNT(*) AS c FROM test_records').get().c;
  res.json({ coachCount, athleteCount, sessionCount, testCount });
});

module.exports = router;
