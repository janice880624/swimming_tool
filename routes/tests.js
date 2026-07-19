const express = require('express');
const { pool } = require('../db');
const { authenticate, requireRole, ah } = require('../middleware/auth');
const { loadOwnedAthlete } = require('./athletes');

// mounted at /api/athletes/:athleteId/tests
const router = express.Router({ mergeParams: true });
router.use(authenticate, requireRole('coach'), loadOwnedAthlete);

router.get('/', ah(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM test_records WHERE athlete_id = $1 ORDER BY date DESC, id DESC',
    [req.athlete.id]
  );
  res.json({ tests: rows });
}));

router.post('/', ah(async (req, res) => {
  const b = req.body || {};
  if (!b.date) return res.status(400).json({ error: '日期為必填' });
  if (b.isBaseline) {
    // Only one baseline record per athlete — clear any existing one first.
    await pool.query('UPDATE test_records SET is_baseline = false WHERE athlete_id = $1', [req.athlete.id]);
  }
  const { rows } = await pool.query(`
    INSERT INTO test_records
      (athlete_id, date, category, stroke, distance, total_time, splits,
       stroke_rate, stroke_length, breath, vjump, ljump, grip_l, grip_r, flex, is_baseline, note)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    RETURNING *
  `, [
    req.athlete.id, b.date, b.category ?? null, b.stroke ?? null, b.distance ?? null,
    b.totalTime ?? null, b.splits ?? null, b.strokeRate ?? null, b.strokeLength ?? null,
    b.breath ?? null, b.vjump ?? null, b.ljump ?? null, b.gripL ?? null, b.gripR ?? null,
    b.flex ?? null, !!b.isBaseline, b.note ?? null
  ]);
  res.status(201).json({ test: rows[0] });
}));

// Mark a specific test record as the athlete's baseline (M2). Clears any previous baseline.
router.patch('/:testId/baseline', ah(async (req, res) => {
  const testId = Number(req.params.testId);
  const existing = await pool.query('SELECT id FROM test_records WHERE id = $1 AND athlete_id = $2', [testId, req.athlete.id]);
  if (!existing.rows.length) return res.status(404).json({ error: '找不到此紀錄' });
  await pool.query('UPDATE test_records SET is_baseline = false WHERE athlete_id = $1', [req.athlete.id]);
  const { rows } = await pool.query('UPDATE test_records SET is_baseline = true WHERE id = $1 RETURNING *', [testId]);
  res.json({ test: rows[0] });
}));

router.delete('/:testId', ah(async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM test_records WHERE id = $1 AND athlete_id = $2',
    [Number(req.params.testId), req.athlete.id]
  );
  if (rowCount === 0) return res.status(404).json({ error: '找不到此紀錄' });
  res.json({ ok: true });
}));

module.exports = router;
