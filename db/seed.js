require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, initSchema } = require('./index');

async function ensureAdmin() {
  await initSchema();

  const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin1234';
  const ADMIN_NAME = process.env.SEED_ADMIN_NAME || '系統管理員';

  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);
  if (rows.length) {
    return { created: false, email: ADMIN_EMAIL };
  }
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
    [ADMIN_NAME, ADMIN_EMAIL, hash, 'admin']
  );
  return { created: true, email: ADMIN_EMAIL, password: ADMIN_PASSWORD };
}

// Allow running directly: `npm run seed`
if (require.main === module) {
  ensureAdmin()
    .then(result => {
      if (!result.created) {
        console.log(`Admin account already exists (${result.email}). Nothing to do.`);
      } else {
        console.log('Seeded initial admin account:');
        console.log(`  email:    ${result.email}`);
        console.log(`  password: ${result.password}`);
        console.log('Change this password after first login. You can override the seed via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars.');
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = { ensureAdmin };
