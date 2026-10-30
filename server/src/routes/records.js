const express = require('express');
const crypto = require('node:crypto');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const { recordType, source, storageKey } = req.body;
  const allowed = ['report', 'prescription', 'discharge_summary', 'clinician_note', 'other'];
  if (!allowed.includes(recordType) || !storageKey) {
    return res.status(400).json({ error: 'Provide a valid record type and a storage reference.' });
  }

  const recordId = crypto.randomUUID();
  const uploadedAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO clinical_records (record_id, user_id, record_type, source, storage_key, sharing_state, uploaded_at)
    VALUES (?, ?, ?, ?, ?, 'private', ?)
  `).run(recordId, req.userId, recordType, source?.trim() || null, storageKey, uploadedAt);

  res.status(201).json({ recordId, uploadedAt });
});

router.get('/', requireAuth, (req, res) => {
  const records = db.prepare(`
    SELECT record_id, record_type, source, storage_key, sharing_state, uploaded_at
    FROM clinical_records WHERE user_id = ? ORDER BY uploaded_at DESC
  `).all(req.userId);

  res.json({ records });
});

router.patch('/:id/sharing', requireAuth, (req, res) => {
  const { sharingState } = req.body;
  if (!['private', 'shared_with_clinician'].includes(sharingState)) {
    return res.status(400).json({ error: 'Invalid sharing state.' });
  }

  const result = db.prepare(`
    UPDATE clinical_records SET sharing_state = ?
    WHERE record_id = ? AND user_id = ?
  `).run(sharingState, req.params.id, req.userId);

  if (result.changes === 0) return res.status(404).json({ error: 'Record not found.' });
  res.json({ recordId: req.params.id, sharingState });
});

module.exports = router;
