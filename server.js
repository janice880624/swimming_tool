require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { router: athleteRoutes } = require('./routes/athletes');
const sessionRoutes = require('./routes/sessions');
const testRoutes = require('./routes/tests');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/athletes/:athleteId/sessions', sessionRoutes);
app.use('/api/athletes/:athleteId/tests', testRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// serve the frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// central error handler so an unexpected exception returns JSON, not an HTML stack trace
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '伺服器發生錯誤' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Coach platform API listening on http://localhost:${PORT}`);
});
