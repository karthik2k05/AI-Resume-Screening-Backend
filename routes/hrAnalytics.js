const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const {
  authenticateToken,
  requireHR
} = require('../middleware/authMiddleware');

// GET /api/hr/analytics/hiring-funnel
// Get candidate progression through hiring stages
router.get(
  '/analytics/hiring-funnel',
  authenticateToken,
  requireHR,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
          COUNT(*) AS applied,
          COUNT(*) FILTER (WHERE status = 'Screening') AS screened,
          COUNT(*) FILTER (WHERE status = 'Interview Scheduled') AS interviewed,
          COUNT(*) FILTER (WHERE status = 'Offer Sent') AS offered,
          COUNT(*) FILTER (WHERE status = 'Hired') AS hired
         FROM applications`
      );

      res.json({
        applied: parseInt(result.rows[0].applied),
        screened: parseInt(result.rows[0].screened),
        interviewed: parseInt(result.rows[0].interviewed),
        offered: parseInt(result.rows[0].offered),
        hired: parseInt(result.rows[0].hired)
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);
router.get('/analytics/feedback', authenticateToken, requireHR, async (req, res) => {
  try {
    const avgResult = await pool.query(`SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS total FROM feedback`);

    const breakdownResult = await pool.query(
      `SELECT rating, COUNT(*) AS count FROM feedback GROUP BY rating ORDER BY rating DESC`
    );

    const listResult = await pool.query(
      `SELECT f.id, c.name AS candidate_name, f.rating, f.comment, f.created_at
       FROM feedback f
       JOIN candidates c ON f.candidate_id = c.id
       ORDER BY f.created_at DESC
       LIMIT 10`
    );

    res.json({
      averageRating: parseFloat(avgResult.rows[0].avg_rating) || 0,
      totalFeedback: parseInt(avgResult.rows[0].total),
      ratingBreakdown: breakdownResult.rows.map(r => ({ rating: r.rating, count: parseInt(r.count) })),
      recentFeedback: listResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;