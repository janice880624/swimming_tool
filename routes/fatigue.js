const express = require('express');
const { pool } = require('../db');
const { authenticate, requireRole, ah } = require('../middleware/auth');
const { loadOwnedAthlete } = require('./athletes');

// mounted at /api/athletes/:athleteId/fatigue
const router = express.Router({ mergeParams: true });
router.use(authenticate, requireRole('coach'), loadOwnedAthlete);

router.get('/', ah(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM fatigue_logs WHERE athlete_id = $1 ORDER BY date DESC, id DESC',
    [req.athlete.id]
  );
  res.json({ logs: rows });
}));

router.post('/', ah(async (req, res) => {
  const b = req.body || {};
  if (!b.date) return res.status(400).json({ error: '日期為必填' });
  const { rows } = await pool.query(`
    INSERT INTO fatigue_logs (athlete_id, date, rpe, duration_min, sleep_quality, recovery_feeling, note)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    req.athlete.id, b.date, b.rpe ?? null, b.durationMin ?? null,
    b.sleepQuality ?? null, b.recoveryFeeling ?? null, b.note ?? null
  ]);
  res.status(201).json({ log: rows[0] });
}));

router.delete('/:logId', ah(async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM fatigue_logs WHERE id = $1 AND athlete_id = $2',
    [Number(req.params.logId), req.athlete.id]
  );
  if (rowCount === 0) return res.status(404).json({ error: '找不到此紀錄' });
  res.json({ ok: true });
}));

module.exports = router;
