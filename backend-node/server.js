const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const diagnoseRoutes = require('./routes/diagnose');

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // Always allow the Vite dev server
      if (origin === 'http://localhost:5173') return callback(null, true);
      // In development, allow any origin
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      // In production, reject unknown origins
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// ── Request logging ──
app.use(morgan('dev'));

// ── Body parsers ──
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Serve uploaded images statically ──
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API routes ──
app.use('/api', diagnoseRoutes);

// ── Health check ──
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ── 404 fallback ──
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ── Global error handler ──
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ── MongoDB connection (optional) ──
async function connectMongo() {
  if (!process.env.MONGODB_URI) {
    console.warn('[MongoDB] MONGODB_URI not set — running without database. Data will be stored in data/history.json.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[MongoDB] Connected successfully.');
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message);
    console.warn('[MongoDB] Continuing without database — using local JSON fallback.');
  }
}

// ── Start server ──
async function start() {
  await connectMongo();

  app.listen(PORT, () => {
    console.log(`\n🌿 Folia API Gateway running on http://localhost:${PORT}`);
    console.log(`   Health check:  http://localhost:${PORT}/health`);
    console.log(`   POST diagnose: http://localhost:${PORT}/api/diagnose`);
    console.log(`   GET  history:  http://localhost:${PORT}/api/history`);
    console.log(`   GET  recurring: http://localhost:${PORT}/api/analytics/recurring\n`);
  });
}

start();
