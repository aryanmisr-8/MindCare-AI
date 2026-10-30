const express = require('express');
const crypto = require('node:crypto');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { INSTRUMENTS } = require('../instruments');

const router = express.Router();

const SCREENING_DISCLAIMER =
  'This is a validated screening instrument, not a clinical diagnosis. Results reflect reported symptoms over the past 2 weeks and serve to guide discussions with a medical professional.';

router.get('/instruments', (req, res) => {
  const list = Object.values(INSTRUMENTS).map((i) => ({
    code: i.code,
    displayName: i.displayName,
    licensing: i.licensing,
    itemCount: i.items ? i.items.length : null,
    note: i.note || null
  }));
  res.json({ instruments: list, disclaimer: SCREENING_DISCLAIMER });
});

router.get('/instruments/:code', (req, res) => {
  const instrument = INSTRUMENTS[req.params.code];
  if (!instrument) return res.status(404).json({ error: 'Unknown screening instrument.' });

  if (instrument.licensing === 'requires_license') {
    return res.status(403).json({
      error: 'This instrument requires a commercial license slot and has not been enabled.',
      note: instrument.note
    });
  }

  res.json({
    code: instrument.code,
    displayName: instrument.displayName,
    items: instrument.items,
    scale: instrument.scale,
    disclaimer: SCREENING_DISCLAIMER
  });
});

function scoreInstrument(instrument, responses) {
  const expectedLength = instrument.items.length;
  if (!Array.isArray(responses) || responses.length !== expectedLength) {
    throw new Error(`Expected ${expectedLength} responses for ${instrument.code}.`);
  }
  const maxVal = Math.max(...instrument.scale.map((s) => s.value));
  for (const r of responses) {
    if (!Number.isInteger(r) || r < 0 || r > maxVal) {
      throw new Error('One or more responses are out of the allowed range.');
    }
  }

  let scored = responses;
  if (instrument.reverseIndices && instrument.reverseIndices.length) {
    scored = responses.map((r, idx) =>
      instrument.reverseIndices.includes(idx) ? maxVal - r : r
    );
  }

  const total = scored.reduce((a, b) => a + b, 0);
  const bandEntry = instrument.bands.find((b) => total <= b.max) || instrument.bands[instrument.bands.length - 1];

  let riskFlag = false;
  if (instrument.selfHarmItemIndex !== null && instrument.selfHarmItemIndex !== undefined) {
    riskFlag = responses[instrument.selfHarmItemIndex] > 0;
  }

  return { total, band: bandEntry.band, note: bandEntry.note, riskFlag };
}

router.post('/sessions', requireAuth, (req, res) => {
  const { instrumentCode, responses } = req.body;
  const instrument = INSTRUMENTS[instrumentCode];
  if (!instrument) return res.status(404).json({ error: 'Unknown screening instrument.' });
  if (instrument.licensing === 'requires_license') {
    return res.status(403).json({ error: 'This instrument is not enabled on this deployment.' });
  }

  let result;
  try {
    result = scoreInstrument(instrument, responses);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO screening_sessions (session_id, user_id, instrument_code, responses, total_score, severity_band, risk_flag, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    req.userId,
    instrumentCode,
    JSON.stringify(responses),
    result.total,
    result.band,
    result.riskFlag ? 1 : 0,
    now
  );

  res.status(201).json({
    sessionId,
    createdAt: now,
    totalScore: result.total,
    severityBand: result.band,
    note: result.note,
    riskFlag: result.riskFlag,
    disclaimer: SCREENING_DISCLAIMER,
    ...(result.riskFlag && {
      immediateSupport: {
        message: 'Your response to question 9 indicates thoughts of self-harm. Please reach out to emergency support immediately — you are not alone.',
        helpline: { name: 'Tele-MANAS (Govt. of India · 24/7 · Toll-free)', number: '14416' }
      }
    })
  });
});

router.get('/sessions', requireAuth, (req, res) => {
  const { instrument } = req.query;
  const params = [req.userId];
  let sql = 'SELECT session_id, instrument_code, responses, total_score, severity_band, risk_flag, created_at FROM screening_sessions WHERE user_id = ?';
  if (instrument) {
    params.push(instrument);
    sql += ' AND instrument_code = ?';
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';

  const rows = db.prepare(sql).all(...params);
  const sessions = rows.map((s) => {
    let resp = [];
    try { resp = JSON.parse(s.responses || '[]'); } catch (_) {}
    return {
      ...s,
      responses: resp,
      risk_flag: !!s.risk_flag
    };
  });

  res.json({ sessions });
});

module.exports = router;
