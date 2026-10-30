const express = require('express');
const crypto = require('node:crypto');
const { db } = require('../db');
const { hashPassword, verifyPassword, signToken } = require('../utils/security');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const CONSENT_PURPOSES = [
  'journaling', 'screening_tools', 'research_library',
  'doctor_directory_gps', 'clinician_export', 'record_upload'
];

router.post('/signup', async (req, res) => {
  const { email, password, displayName, state, consents } = req.body;

  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Enter a valid email and a password of at least 8 characters.' });
  }

  const existing = db.prepare('SELECT user_id FROM users WHERE email = ? COLLATE NOCASE').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (user_id, email, password_hash, display_name, state, role, created_at)
    VALUES (?, ?, ?, ?, ?, 'user', ?)
  `).run(userId, email.trim(), passwordHash, displayName?.trim() || null, state?.trim() || null, now);

  const insertConsent = db.prepare(`
    INSERT INTO consents (consent_id, user_id, purpose, status, version, granted_at)
    VALUES (?, ?, ?, 'granted', 1, ?)
  `);

  // Only record consent for purposes the user explicitly checked — never assume "granted".
  const grantedPurposes = CONSENT_PURPOSES.filter((p) => consents && consents[p] === true);
  for (const purpose of grantedPurposes) {
    insertConsent.run(crypto.randomUUID(), userId, purpose, now);
  }

  const user = { user_id: userId, email, display_name: displayName, role: 'user' };
  const token = signToken(user);
  res.status(201).json({
    token,
    user: { id: user.user_id, email: user.email, displayName: user.display_name }
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }

  const user = db.prepare(`
    SELECT user_id, email, display_name, role, password_hash
    FROM users WHERE email = ? COLLATE NOCASE AND deleted_at IS NULL
  `).get(email.trim());

  // Deliberately generic error — never reveal whether the email exists.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  db.prepare('UPDATE users SET last_login_at = ? WHERE user_id = ?').run(new Date().toISOString(), user.user_id);

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.user_id, email: user.email, displayName: user.display_name }
  });
});

// Fetch active consents for current user
router.get('/consents', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT purpose, status, MAX(version) as version
    FROM consents WHERE user_id = ?
    GROUP BY purpose
  `).all(req.userId);

  const consentMap = {};
  for (const r of rows) {
    consentMap[r.purpose] = r.status === 'granted';
  }
  res.json({ consents: consentMap });
});

// Withdraw or grant a specific consent purpose at any time (DPDP Act right to withdraw consent).
router.post('/consent', requireAuth, (req, res) => {
  const { purpose, status } = req.body;
  if (!CONSENT_PURPOSES.includes(purpose) || !['granted', 'revoked'].includes(status)) {
    return res.status(400).json({ error: 'Unrecognised consent purpose or status.' });
  }

  const latest = db.prepare(`
    SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM consents WHERE user_id = ? AND purpose = ?
  `).get(req.userId, purpose);

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO consents (consent_id, user_id, purpose, status, version, granted_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    req.userId,
    purpose,
    status,
    latest.next_version,
    status === 'granted' ? now : null,
    status === 'revoked' ? now : null
  );

  res.json({ purpose, status });
});

module.exports = router;
