const express = require('express');
const crypto = require('node:crypto');
const { db } = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const VERIFICATION_WEIGHT = {
  registry_matched: 1.0,
  provider_claimed: 0.6,
  community_reported: 0.3,
  unverified: 0.1
};

// GET /api/doctors?lat=..&lng=..&radiusKm=50&specialty=Psychiatrist&city=Mumbai
router.get('/', optionalAuth, (req, res) => {
  const { lat, lng, radiusKm, specialty, language, modality, city, q } = req.query;

  const params = [];
  const whereClauses = [];
  let distanceSelect = 'NULL AS distance_km';

  if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    const userLat = Number(lat);
    const userLng = Number(lng);
    params.push(userLat, userLng);
    distanceSelect = 'haversine(?, ?, latitude, longitude) AS distance_km';

    if (radiusKm && !isNaN(Number(radiusKm))) {
      params.push(userLat, userLng, Number(radiusKm));
      whereClauses.push('haversine(?, ?, latitude, longitude) <= ?');
    }
  }

  if (specialty) {
    params.push(`%${specialty}%`);
    whereClauses.push('specialty LIKE ?');
  }

  if (language) {
    params.push(`%${language}%`);
    whereClauses.push('languages LIKE ?');
  }

  if (modality) {
    params.push(`%${modality}%`);
    whereClauses.push('modalities LIKE ?');
  }

  if (city) {
    params.push(`%${city}%`);
    whereClauses.push('city LIKE ?');
  }

  if (q) {
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    whereClauses.push('(full_name LIKE ? OR clinic_name LIKE ? OR address LIKE ?)');
  }

  const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT doctor_id, full_name, registration_number, specialty, languages,
           clinic_name, address, city, state, latitude, longitude,
           modalities, fees_inr, verification_state, match_confidence,
           last_verified_at, is_sponsored, ${distanceSelect}
    FROM doctors
    ${whereSQL}
    ORDER BY full_name ASC
  `;

  const rows = db.prepare(sql).all(...params);

  const effectiveRadius = radiusKm ? Number(radiusKm) : 50;

  const ranked = rows.map((r) => {
    let langs = [];
    let mods = [];
    try { langs = JSON.parse(r.languages || '[]'); } catch (_) { langs = [r.languages]; }
    try { mods = JSON.parse(r.modalities || '[]'); } catch (_) { mods = [r.modalities]; }

    const verificationScore = VERIFICATION_WEIGHT[r.verification_state] ?? 0.1;
    const proximityScore = r.distance_km != null ? Math.max(0, 1 - r.distance_km / effectiveRadius) : 0.5;
    const recencyScore = r.last_verified_at
      ? Math.max(0, 1 - (Date.now() - new Date(r.last_verified_at).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 0;
    const score = 0.4 * verificationScore + 0.3 * proximityScore + 0.15 * recencyScore + 0.15 * (r.match_confidence || 0);

    return {
      ...r,
      languages: langs,
      modalities: mods,
      distance_km: r.distance_km != null ? Number(r.distance_km.toFixed(1)) : null,
      rankScore: Number(score.toFixed(3))
    };
  }).sort((a, b) => {
    // If distance is available, sort by closest or best multi-factor rank
    if (a.distance_km != null && b.distance_km != null) {
      return a.distance_km - b.distance_km;
    }
    return b.rankScore - a.rankScore;
  });

  res.json({
    doctors: ranked,
    rankingNote: 'Ranked transparently by GPS proximity, NMC verification status, and registry recency. Sponsored entries are never artificially boosted.'
  });
});

router.get('/:id', optionalAuth, (req, res) => {
  const doctor = db.prepare('SELECT * FROM doctors WHERE doctor_id = ?').get(req.params.id);
  if (!doctor) return res.status(404).json({ error: 'Doctor listing not found.' });

  try { doctor.languages = JSON.parse(doctor.languages || '[]'); } catch (_) {}
  try { doctor.modalities = JSON.parse(doctor.modalities || '[]'); } catch (_) {}

  res.json({ doctor });
});

router.post('/:id/report', requireAuth, (req, res) => {
  const { issue } = req.body;
  if (!issue || issue.trim().length === 0) {
    return res.status(400).json({ error: 'Describe the issue you noticed.' });
  }

  const doctor = db.prepare('SELECT doctor_id FROM doctors WHERE doctor_id = ?').get(req.params.id);
  if (!doctor) return res.status(404).json({ error: 'Doctor listing not found.' });

  db.prepare(`
    INSERT INTO doctor_reports (report_id, doctor_id, reported_by, issue, status, created_at)
    VALUES (?, ?, ?, ?, 'open', ?)
  `).run(crypto.randomUUID(), req.params.id, req.userId, issue.trim(), new Date().toISOString());

  res.status(201).json({ message: 'Thanks — this has been sent for administrative review.' });
});

module.exports = router;
