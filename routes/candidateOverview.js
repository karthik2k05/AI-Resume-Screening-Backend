const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/:id/overview', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Ownership check: logged-in user can only view their own overview
  if (String(req.user.id) !== String(id)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  try {
    const resumeResult = await pool.query(
      `SELECT id, match_score, match_summary
       FROM resumes
       WHERE candidate_id = $1
       ORDER BY uploaded_at DESC
       LIMIT 1`,
      [id]
    );

    if (resumeResult.rows.length === 0) {
      return res.status(404).json({ message: 'No resume found for candidate' });
    }

    const resume = resumeResult.rows[0];

    const skillsResult = await pool.query(
      `SELECT skill_name, match_percentage
       FROM skill_matches
       WHERE resume_id = $1
       ORDER BY match_percentage DESC`,
      [resume.id]
    );

    const appsResult = await pool.query(
      `SELECT COUNT(*) FROM applications
       WHERE candidate_id = $1 AND status = 'in_progress'`,
      [id]
    );

    const jobMatchResult = await pool.query(
      `SELECT COUNT(*) FROM job_matches
       WHERE candidate_id = $1 AND recommended = true`,
      [id]
    );

    res.json({
      matchScore: resume.match_score,
      matchSummary: resume.match_summary,
      skills: skillsResult.rows,
      applicationsInProgress: parseInt(appsResult.rows[0].count),
      recommendedJobs: parseInt(jobMatchResult.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
//feedback
router.post('/:id/feedback', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (String(req.user.id) !== String(id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO feedback (candidate_id, rating, comment) VALUES ($1, $2, $3) RETURNING *`,
      [id, rating, comment || null]
    );
    res.status(201).json({ message: 'Feedback submitted successfully', feedback: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;