const express = require('express');
const { db } = require('../db');

const router = express.Router();

// GET /api/papers?condition=depression&type=meta_analysis&q=chatbot
router.get('/', (req, res) => {
  const { condition, type, q } = req.query;
  const params = [];
  const where = [];

  if (condition) {
    params.push(`%${condition}%`);
    where.push('condition_tags LIKE ?');
  }

  if (type) {
    params.push(type);
    where.push('evidence_type = ?');
  }

  if (q) {
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    where.push('(title LIKE ? OR outcome_summary LIKE ? OR plain_summary LIKE ? OR authors LIKE ?)');
  }

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT paper_id, title, authors, year, evidence_type, condition_tags, population,
           outcome_summary, limitations, doi_or_url, open_access, source, review_date, plain_summary
    FROM research_papers
    ${whereSQL}
    ORDER BY year DESC
    LIMIT 100
  `;

  const rows = db.prepare(sql).all(...params);
  const papers = rows.map((p) => {
    let tags = [];
    try { tags = JSON.parse(p.condition_tags || '[]'); } catch (_) { tags = [p.condition_tags]; }
    return {
      ...p,
      condition_tags: tags,
      open_access: Boolean(p.open_access)
    };
  });

  res.json({ papers });
});

router.get('/:id', (req, res) => {
  const paper = db.prepare('SELECT * FROM research_papers WHERE paper_id = ?').get(req.params.id);
  if (!paper) return res.status(404).json({ error: 'Paper not found.' });

  try { paper.condition_tags = JSON.parse(paper.condition_tags || '[]'); } catch (_) {}
  paper.open_access = Boolean(paper.open_access);

  res.json({ paper });
});

module.exports = router;
