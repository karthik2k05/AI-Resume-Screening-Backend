const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/admin/analytics/funnel
// Returns hiring funnel stage counts for the bar chart
router.get('/analytics/funnel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) AS applied,
         COUNT(*) FILTER (WHERE status IN ('screening','interview_scheduled','offer_sent','hired')) AS screened,
         COUNT(*) FILTER (WHERE status IN ('interview_scheduled','offer_sent','hired')) AS interviewed,
         COUNT(*) FILTER (WHERE status IN ('offer_sent','hired')) AS offered,
         COUNT(*) FILTER (WHERE status = 'hired') AS hired
       FROM applications`
    );

    const row = result.rows[0];

    res.json([
      { stage: 'Applied', count: parseInt(row.applied) },
      { stage: 'Screened', count: parseInt(row.screened) },
      { stage: 'Interviewed', count: parseInt(row.interviewed) },
      { stage: 'Offered', count: parseInt(row.offered) },
      { stage: 'Hired', count: parseInt(row.hired) },
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/analytics/feedback', authenticateToken, requireAdmin, async (req, res) => {
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