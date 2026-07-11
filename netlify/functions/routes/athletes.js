const express = require('express');
const { pool } = require('../db');
const { authenticate, requireRole, ah } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('coach'));

// Every query below is scoped by coach_id = req.user.id.
// A coach can never see or touch another coach's athletes, even by guessing an id,
// because every lookup includes "AND coach_id = $n".

router.get('/', ah(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM athletes WHERE coach_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ athletes: rows });
}));

router.post('/', ah(async (req, res) => {
  const { name, gender, event, height, weight, age, note } = req.body || {};
  if (!name) return res.status(400).json({ error: '姓名為必填' });
  const { rows } = await pool.query(`
    INSERT INTO athletes (coach_id, name, gender, event, height, weight, age, note)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [req.user.id, name, gender || null, event || null, height ?? null, weight ?? null, age ?? null, note || null]);
  res.status(201).json({ athlete: rows[0] });
}));

async function loadOwnedAthlete(req, res, next) {
  const id = Number(req.params.athleteId || req.params.id);
  const { rows } = await pool.query('SELECT * FROM athletes WHERE id = $1 AND coach_id = $2', [id, req.user.id]);
  const athlete = rows[0];
  if (!athlete) return res.status(404).json({ error: '找不到此選手，或您沒有權限存取' });
  req.athlete = athlete;
  next();
}
const loadOwnedAthleteSafe = ah(loadOwnedAthlete);

router.get('/:id', loadOwnedAthleteSafe, (req, res) => {
  res.json({ athlete: req.athlete });
});

router.put('/:id', loadOwnedAthleteSafe, ah(async (req, res) => {
  const { name, gender, event, height, weight, age, note } = req.body || {};
  const { rows } = await pool.query(`
    UPDATE athletes SET name=$1, gender=$2, event=$3, height=$4, weight=$5, age=$6, note=$7
    WHERE id = $8 AND coach_id = $9
    RETURNING *
  `, [
    name ?? req.athlete.name, gender ?? req.athlete.gender, event ?? req.athlete.event,
    height ?? req.athlete.height, weight ?? req.athlete.weight, age ?? req.athlete.age,
    note ?? req.athlete.note, req.athlete.id, req.user.id
  ]);
  res.json({ athlete: rows[0] });
}));

router.delete('/:id', loadOwnedAthleteSafe, ah(async (req, res) => {
  await pool.query('DELETE FROM athletes WHERE id = $1 AND coach_id = $2', [req.athlete.id, req.user.id]);
  res.json({ ok: true });
}));

module.exports = { router, loadOwnedAthlete: loadOwnedAthleteSafe };
