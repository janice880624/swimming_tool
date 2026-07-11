const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { loadOwnedAthlete } = require('./athletes');

// mounted at /api/athletes/:athleteId/tests
const router = express.Router({ mergeParams: true });
router.use(authenticate, requireRole('coach'), loadOwnedAthlete);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM test_records WHERE athlete_id = ? ORDER BY date DESC, id DESC')
    .all(req.athlete.id);
  res.json({ tests: rows });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.date) return res.status(400).json({ error: '日期為必填' });
  const info = db.prepare(`
    INSERT INTO test_records
      (athlete_id, date, category, stroke, distance, total_time, splits,
       stroke_rate, stroke_length, breath, vjump, ljump, grip_l, grip_r, flex, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.athlete.id, b.date, b.category ?? null, b.stroke ?? null, b.distance ?? null,
    b.totalTime ?? null, b.splits ?? null, b.strokeRate ?? null, b.strokeLength ?? null,
    b.breath ?? null, b.vjump ?? null, b.ljump ?? null, b.gripL ?? null, b.gripR ?? null,
    b.flex ?? null, b.note ?? null
  );
  const row = db.prepare('SELECT * FROM test_records WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ test: row });
});

router.delete('/:testId', (req, res) => {
  const info = db.prepare('DELETE FROM test_records WHERE id = ? AND athlete_id = ?')
    .run(Number(req.params.testId), req.athlete.id);
  if (info.changes === 0) return res.status(404).json({ error: '找不到此紀錄' });
  res.json({ ok: true });
});

module.exports = router;
