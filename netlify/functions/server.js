const path = require('path');
const express = require('express');
const app = require('./app');
const { ensureAdmin } = require('./db/seed');

// serve the frontend (Netlify doesn't need this — its own CDN serves public/ directly)
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.attachErrorHandler();

const PORT = process.env.PORT || 3000;

async function start() {
  // Create the schema (if needed) and bootstrap the first admin account automatically.
  // Safe to run on every startup — both are no-ops once they already exist.
  const seedResult = await ensureAdmin();
  if (seedResult.created) {
    console.log('No admin account found — created one automatically:');
    console.log(`  email:    ${seedResult.email}`);
    console.log(`  password: ${seedResult.password}`);
    console.log('Log in and change this password as soon as possible.');
  }
  app.listen(PORT, () => {
    console.log(`Coach platform API listening on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
