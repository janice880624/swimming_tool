const express = require('express');
const { pool } = require('../db');
const { authenticate, requireRole, ah } = require('../middleware/auth');
const { loadOwnedAthlete } = require('./athletes');

// mounted at /api/athletes/:athleteId/prescriptions
const router = express.Router({ mergeParams: true });
router.use(authenticate, requireRole('coach'), loadOwnedAthlete);

router.get('/', ah(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM prescriptions WHERE athlete_id = $1 ORDER BY date DESC, id DESC',
    [req.athlete.id]
  );
  res.json({ prescriptions: rows });
}));

router.post('/', ah(async (req, res) => {
  const b = req.body || {};
  if (!b.date) return res.status(400).json({ error: '日期為必填' });
  if (!b.content || !b.content.trim()) return res.status(400).json({ error: '處方內容不可為空' });
  const { rows } = await pool.query(`
    INSERT INTO prescriptions (athlete_id, date, content)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [req.athlete.id, b.date, b.content.trim()]);
  res.status(201).json({ prescription: rows[0] });
}));

router.delete('/:prescriptionId', ah(async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM prescriptions WHERE id = $1 AND athlete_id = $2',
    [Number(req.params.prescriptionId), req.athlete.id]
  );
  if (rowCount === 0) return res.status(404).json({ error: '找不到此紀錄' });
  res.json({ ok: true });
}));

module.exports = router;
