require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { router: athleteRoutes } = require('./routes/athletes');
const sessionRoutes = require('./routes/sessions');
const testRoutes = require('./routes/tests');
const fatigueRoutes = require('./routes/fatigue');
const prescriptionRoutes = require('./routes/prescriptions');

// This module only defines the API (routes + middleware). It does NOT call
// app.listen() and does NOT serve static files — that's handled differently
// depending on where it runs:
//   - server.js         -> traditional Node server (Render, local dev): adds
//                          static file serving + calls app.listen()
//   - netlify/functions/api.js -> wraps this app with serverless-http; Netlify's
//                          own CDN serves public/ directly, no static middleware needed
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/athletes/:athleteId/sessions', sessionRoutes);
app.use('/api/athletes/:athleteId/tests', testRoutes);
app.use('/api/athletes/:athleteId/fatigue', fatigueRoutes);
app.use('/api/athletes/:athleteId/prescriptions', prescriptionRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

module.exports = app;

// Attaches the error-handling middleware. Must be called LAST by whichever
// entrypoint uses this app (after any additional routes/static serving are added),
// since Express only routes errors to handlers registered after the point of failure.
module.exports.attachErrorHandler = function attachErrorHandler() {
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: '伺服器發生錯誤' });
  });
};

