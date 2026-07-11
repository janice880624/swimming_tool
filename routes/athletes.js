const express = require('express');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('coach'));

// Every query below is scoped by coach_id = req.user.id.
// A coach can never see or touch another coach's athletes, even by guessing an id,
// because every lookup includes "AND coach_id = ?".

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM athletes WHERE coach_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ athletes: rows });
});

router.post('/', (req, res) => {
  const { name, gender, event, height, weight, age, note } = req.body || {};
  if (!name) return res.status(400).json({ error: '姓名為必填' });
  const info = db.prepare(`
    INSERT INTO athletes (coach_id, name, gender, event, height, weight, age, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name, gender || null, event || null, height ?? null, weight ?? null, age ?? null, note || null);
  const athlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ athlete });
});

function loadOwnedAthlete(req, res, next) {
  const id = Number(req.params.athleteId || req.params.id);
  const athlete = db.prepare('SELECT * FROM athletes WHERE id = ? AND coach_id = ?').get(id, req.user.id);
  if (!athlete) return res.status(404).json({ error: '找不到此選手，或您沒有權限存取' });
  req.athlete = athlete;
  next();
}

router.get('/:id', loadOwnedAthlete, (req, res) => {
  res.json({ athlete: req.athlete });
});

router.put('/:id', loadOwnedAthlete, (req, res) => {
  const { name, gender, event, height, weight, age, note } = req.body || {};
  db.prepare(`
    UPDATE athletes SET name=?, gender=?, event=?, height=?, weight=?, age=?, note=?
    WHERE id = ? AND coach_id = ?
  `).run(name ?? req.athlete.name, gender ?? req.athlete.gender, event ?? req.athlete.event,
         height ?? req.athlete.height, weight ?? req.athlete.weight, age ?? req.athlete.age,
         note ?? req.athlete.note, req.athlete.id, req.user.id);
  const updated = db.prepare('SELECT * FROM athletes WHERE id = ?').get(req.athlete.id);
  res.json({ athlete: updated });
});

router.delete('/:id', loadOwnedAthlete, (req, res) => {
  db.prepare('DELETE FROM athletes WHERE id = ? AND coach_id = ?').run(req.athlete.id, req.user.id);
  res.json({ ok: true });
});

module.exports = { router, loadOwnedAthlete };
