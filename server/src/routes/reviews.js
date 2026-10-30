const express = require('express');
const crypto = require('node:crypto');
const { db } = require('../db');
const router = express.Router();

/**
 * GET /api/reviews
 * Fetch recent featured website reviews and feedback.
 */
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const type = req.query.type;

    let query = 'SELECT review_id, author_name, rating, feedback_type, comment, created_at FROM website_reviews WHERE is_featured = 1';
    const params = [];

    if (type) {
      query += ' AND feedback_type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const reviews = db.prepare(query).all(...params);

    // Get average rating summary
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating), 1) as avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star_count
      FROM website_reviews
    `).get();

    res.json({
      reviews,
      stats: {
        total_reviews: stats.total_reviews || 0,
        avg_rating: stats.avg_rating || 5.0,
        five_star_count: stats.five_star_count || 0
      }
    });
  } catch (err) {
    console.error('Error fetching website reviews:', err);
    res.status(500).json({ error: 'Failed to retrieve website reviews.' });
  }
});

/**
 * POST /api/reviews
 * Submit a user experience review / feedback for the website.
 */
router.post('/', (req, res) => {
  try {
    const { author_name, rating, feedback_type, comment } = req.body;

    if (!author_name || typeof author_name !== 'string' || !author_name.trim()) {
      return res.status(400).json({ error: 'Please provide your name.' });
    }

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5.' });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide feedback comments (at least 5 characters).' });
    }

    const validTypes = ['general', 'screening', 'doctor_finder', 'journal', 'medicines', 'ui_design'];
    const cleanType = validTypes.includes(feedback_type) ? feedback_type : 'general';

    const reviewId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO website_reviews (review_id, author_name, rating, feedback_type, comment, created_at, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    insertStmt.run(
      reviewId,
      author_name.trim().substring(0, 100),
      numRating,
      cleanType,
      comment.trim().substring(0, 1000),
      createdAt
    );

    res.status(201).json({
      message: 'Thank you for your feedback! Your review has been submitted successfully.',
      review: {
        review_id: reviewId,
        author_name: author_name.trim(),
        rating: numRating,
        feedback_type: cleanType,
        comment: comment.trim(),
        created_at: createdAt
      }
    });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ error: 'Failed to record review.' });
  }
});

module.exports = router;
