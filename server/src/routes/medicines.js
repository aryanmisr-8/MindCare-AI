const express = require('express');
const { db } = require('../db');

const router = express.Router();

// GET /api/medicines/companies — List pharmaceutical companies for filter dropdown
router.get('/companies', (req, res) => {
  const companies = db.prepare(`
    SELECT c.company_id, c.legal_name, c.role, c.source, COUNT(m.medicine_id) AS medicine_count
    FROM companies c
    LEFT JOIN medicines m ON c.company_id = m.company_id
    GROUP BY c.company_id
    ORDER BY c.legal_name ASC
  `).all();
  res.json({ companies });
});

// GET /api/medicines?q=escitalopram&company=...&category=...&form=...
router.get('/', (req, res) => {
  const { q, company, category, form } = req.query;
  const params = [];
  const where = ['m.canonical_of IS NULL'];

  if (q) {
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    where.push('(m.generic_name LIKE ? OR m.brand_name LIKE ? OR m.category LIKE ?)');
  }

  if (company) {
    params.push(`%${company}%`);
    where.push('(c.legal_name LIKE ? OR c.company_id = ?)');
    params.push(company);
  }

  if (category) {
    params.push(`%${category}%`);
    where.push('m.category LIKE ?');
  }

  if (form) {
    params.push(`%${form}%`);
    where.push('m.dosage_form LIKE ?');
  }

  const sql = `
    SELECT m.medicine_id, m.generic_name, m.brand_name, m.strength, m.dosage_form, m.pack_size,
           m.schedule, m.requires_prescription, m.category,
           c.legal_name AS company_name, c.company_id,
           MIN(p.mrp_inr) AS min_price,
           MAX(p.mrp_inr) AS max_price
    FROM medicines m
    LEFT JOIN companies c ON m.company_id = c.company_id
    LEFT JOIN medicine_prices p ON m.medicine_id = p.medicine_id
    WHERE ${where.join(' AND ')}
    GROUP BY m.medicine_id
    ORDER BY m.generic_name ASC, m.brand_name ASC
    LIMIT 100
  `;

  const medicines = db.prepare(sql).all(...params);

  res.json({
    medicines,
    disclaimer: 'Information for education & transparent pricing only. Not a prescription or medical endorsement. Always consult a qualified psychiatrist or medical professional before starting or changing medications.'
  });
});

router.get('/:id/prices', (req, res) => {
  const prices = db.prepare(`
    SELECT source, geography, mrp_inr, ceiling_price_inr, effective_date, captured_at
    FROM medicine_prices
    WHERE medicine_id = ?
    ORDER BY mrp_inr ASC
  `).all(req.params.id);

  res.json({
    prices,
    disclaimer: 'Prices sourced from NPPA Pharma Sahi Daam & Jan Aushadhi generic catalogs. Confirm local availability at verified pharmacies.'
  });
});

module.exports = router;
