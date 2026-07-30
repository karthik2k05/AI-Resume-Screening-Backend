const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/:id/job-matches', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (String(req.user.id) !== String(id)) {
    return res.status(403).json({
      message: 'Access denied'
    });
  }

  // Allowed sorting columns
  const allowedSortColumns = {
    match_score: 'jm.match_score',
    title: 'j.title',
    company: 'j.company',
    location: 'j.location'
  };

  // Get sort column from URL
  const sortKey =
    allowedSortColumns[req.query.sort] ||
    allowedSortColumns.match_score;

  // Get sort order from URL
  const sortOrder =
    req.query.order &&
    req.query.order.toLowerCase() === 'asc'
      ? 'ASC'
      : 'DESC';

  try {
    const result = await pool.query(
      `SELECT
         jm.id,
         j.title,
         j.company,
         j.location,
         jm.match_score
       FROM job_matches jm
       JOIN job_postings j
         ON jm.job_id = j.id
       WHERE jm.candidate_id = $1
       AND jm.recommended = true
       ORDER BY ${sortKey} ${sortOrder}`,
      [id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Server error'
    });
  }
});

module.exports = router;