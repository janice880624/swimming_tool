const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { loadOwnedAthlete } = require('./athletes');

// mounted at /api/athletes/:athleteId/sessions
const router = express.Router({ mergeParams: true });
router.use(authenticate, requireRole('coach'), loadOwnedAthlete);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM resistance_sessions WHERE athlete_id = ? ORDER BY date DESC, id DESC')
    .all(req.athlete.id);
  res.json({ sessions: rows });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.date) return res.status(400).json({ error: '日期為必填' });
  const info = db.prepare(`
    INSERT INTO resistance_sessions
      (athlete_id, date, type, side, resistance, peak, avg, ratio, reps,
       max_speed, avg_speed, accel, dist, tot_max_speed, tot_dist, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.athlete.id, b.date, b.type ?? null, b.side ?? null, b.resistance ?? null,
    b.peak ?? null, b.avg ?? null, b.ratio ?? null, b.reps ?? null,
    b.maxSpeed ?? null, b.avgSpeed ?? null, b.accel ?? null,
    b.dist ?? null, b.totMaxSpeed ?? null, b.totDist ?? null, b.note ?? null
  );
  const row = db.prepare('SELECT * FROM resistance_sessions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ session: row });
});

router.delete('/:sessionId', (req, res) => {
  const info = db.prepare('DELETE FROM resistance_sessions WHERE id = ? AND athlete_id = ?')
    .run(Number(req.params.sessionId), req.athlete.id);
  if (info.changes === 0) return res.status(404).json({ error: '找不到此紀錄' });
  res.json({ ok: true });
});

module.exports = router;
