require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./index');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin1234';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || '系統管理員';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);

if (existing) {
  console.log(`Admin account already exists (${ADMIN_EMAIL}). Nothing to do.`);
} else {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(ADMIN_NAME, ADMIN_EMAIL, hash, 'admin');
  console.log('Seeded initial admin account:');
  console.log(`  email:    ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log('Change this password after first login. You can override the seed via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars.');
}
