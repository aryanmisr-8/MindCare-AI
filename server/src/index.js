require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { initDb } = require('./init-db');
const authRoutes = require('./routes/auth');
const screeningRoutes = require('./routes/screenings');
const journalRoutes = require('./routes/journal');
const doctorRoutes = require('./routes/doctors');
const medicineRoutes = require('./routes/medicines');
const paperRoutes = require('./routes/papers');
const recordRoutes = require('./routes/records');
const reviewRoutes = require('./routes/reviews');

// Automatically initialize database schema and seeds
initDb();

const app = express();

// Disable CSP in dev so Leaflet OpenStreetMap tiles, Google Fonts, and Leaflet CDN work seamlessly
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Permissive CORS for local development
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));

// Static client file serving from parent client directory
const clientDir = path.join(__dirname, '..', '..', 'client');
app.use(express.static(clientDir));

// Route root / directly to /pages/index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(clientDir, 'pages', 'index.html'));
});

// Basic rate limiting on auth to slow credential-stuffing attempts
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Crisis helpline metadata for emergency banners
app.get('/api/crisis-resources', (req, res) => {
  res.json({
    country: 'India',
    helpline: {
      name: process.env.CRISIS_HELPLINE_NAME || 'Tele-MANAS',
      number: process.env.CRISIS_HELPLINE_NUMBER || '14416',
      hours: '24/7, free, multilingual, Govt. of India'
    },
    emergency: { name: 'National emergency number', number: '112' }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/screenings', screeningRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/reviews', reviewRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Something went wrong on our end. Please try again.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  MindCare AI Platform running at http://localhost:${PORT}`);
  console.log(`  Client web interface: http://localhost:${PORT}/pages/index.html`);
  console.log(`====================================================`);
});
