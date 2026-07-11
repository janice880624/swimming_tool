const express = require('express');
const { pool } = require('../db');
const { authenticate, requireRole, ah } = require('../middleware/auth');
const { loadOwnedAthlete } = require('./athletes');

// mounted at /api/athletes/:athleteId/sessions
const router = express.Router({ mergeParams: true });
router.use(authenticate, requireRole('coach'), loadOwnedAthlete);

router.get('/', ah(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM resistance_sessions WHERE athlete_id = $1 ORDER BY date DESC, id DESC',
    [req.athlete.id]
  );
  res.json({ sessions: rows });
}));

router.post('/', ah(async (req, res) => {
  const b = req.body || {};
  if (!b.date) return res.status(400).json({ error: '日期為必填' });
  const { rows } = await pool.query(`
    INSERT INTO resistance_sessions
      (athlete_id, date, type, side, resistance, peak, avg, ratio, reps,
       max_speed, avg_speed, accel, dist, tot_max_speed, tot_dist, note)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *
  `, [
    req.athlete.id, b.date, b.type ?? null, b.side ?? null, b.resistance ?? null,
    b.peak ?? null, b.avg ?? null, b.ratio ?? null, b.reps ?? null,
    b.maxSpeed ?? null, b.avgSpeed ?? null, b.accel ?? null,
    b.dist ?? null, b.totMaxSpeed ?? null, b.totDist ?? null, b.note ?? null
  ]);
  res.status(201).json({ session: rows[0] });
}));

router.delete('/:sessionId', ah(async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM resistance_sessions WHERE id = $1 AND athlete_id = $2',
    [Number(req.params.sessionId), req.athlete.id]
  );
  if (rowCount === 0) return res.status(404).json({ error: '找不到此紀錄' });
  res.json({ ok: true });
}));

module.exports = router;
