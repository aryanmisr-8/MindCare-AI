const express = require('express');
const crypto = require('node:crypto');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { encryptText, decryptText } = require('../utils/security');
const { retrieve } = require('../rag/retrieve');
const { assessRisk, CRISIS_RESOURCES } = require('../rag/risk');
const { detectTrend } = require('../rag/trend');

const router = express.Router();

router.post('/entries', requireAuth, (req, res) => {
  const { content, moodScore, anxietyScore, sleepHours, energyScore, tags } = req.body;
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Write something before saving your entry.' });
  }

  // Check recent screening session for item-level risk flag
  const recentScreen = db.prepare(`
    SELECT risk_flag FROM screening_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(req.userId);
  const recentItemLevelFlag = Boolean(recentScreen?.risk_flag);

  const risk = assessRisk({ freeText: content, recentItemLevelFlag });

  const encrypted = encryptText(content);
  const entryId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO journal_entries (entry_id, user_id, content_encrypted, mood_score, anxiety_score, sleep_hours, energy_score, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entryId,
    req.userId,
    encrypted,
    moodScore || null,
    anxietyScore || null,
    sleepHours || null,
    energyScore || null,
    tags ? JSON.stringify(tags) : null,
    now
  );

  // RAG retrieval: grounded, source-tagged passages
  const passages = retrieve(content, 3);
  const reflection = passages.length > 0
    ? {
        grounded: true,
        passages,
        message: 'Here is clinically grounded context that may be relevant to what you wrote — not personalized advice, but evidence-based perspectives.'
      }
    : {
        grounded: false,
        passages: [],
        message: 'Your thoughts have been safely encrypted and saved. Continuing regular reflection builds emotional resilience.'
      };

  const responsePayload = {
    entryId,
    createdAt: now,
    reflection
  };

  if (risk.tier === 'immediate') {
    responsePayload.crisisSupport = {
      message: 'What you wrote suggests you may be experiencing severe distress or thoughts of harm. Support is available right now — please connect with someone who can help.',
      ...CRISIS_RESOURCES
    };
  } else if (risk.tier === 'elevated') {
    responsePayload.gentleNudge = {
      message: 'Things seem challenging right now. Consider connecting with a verified mental health professional or calling Tele-MANAS (14416) for guidance.',
      helpline: CRISIS_RESOURCES.helpline
    };
  }

  res.status(201).json(responsePayload);
});

router.get('/entries', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT entry_id, content_encrypted, mood_score, anxiety_score, sleep_hours, energy_score, tags, created_at
    FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 200
  `).all(req.userId);

  const entries = rows.map((row) => {
    let content = '';
    try {
      content = decryptText(Buffer.from(row.content_encrypted));
    } catch (_) {
      content = '[Encrypted entry]';
    }

    let parsedTags = [];
    try { parsedTags = JSON.parse(row.tags || '[]'); } catch (_) {}

    return {
      entryId: row.entry_id,
      content,
      moodScore: row.mood_score,
      anxietyScore: row.anxiety_score,
      sleepHours: row.sleep_hours,
      energyScore: row.energy_score,
      tags: parsedTags,
      createdAt: row.created_at
    };
  });

  res.json({ entries });
});

router.get('/trend', requireAuth, (req, res) => {
  const metric = ['mood_score', 'anxiety_score', 'energy_score'].includes(req.query.metric)
    ? req.query.metric
    : 'mood_score';

  const rows = db.prepare(`
    SELECT ${metric} AS value, created_at AS at FROM journal_entries
    WHERE user_id = ? AND ${metric} IS NOT NULL ORDER BY created_at ASC
  `).all(req.userId);

  const trend = detectTrend(rows.map((r) => ({ value: r.value, at: r.at })));
  res.json({ metric, trend, pointCount: rows.length });
});

module.exports = router;
