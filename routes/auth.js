const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { JWT_SECRET, authenticate, ah } = require('../middleware/auth');

const router = express.Router();

router.post('/login', ah(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: '請輸入 Email 與密碼' });
  }
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 AND active = 1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Email 或密碼錯誤' });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Email 或密碼錯誤' });

  const payload = { id: user.id, role: user.role, name: user.name, email: user.email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: payload });
}));

// Return the current logged-in user's info (used by frontend on page load to restore session)
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
