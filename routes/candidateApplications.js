const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');


// POST /api/candidate/:id/applications
// Create application when candidate applies
router.post('/:id/applications', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { job_id } = req.body;

  // Candidate can only apply using their own ID
  if (String(req.user.id) !== String(id)) {
    return res.status(403).json({
      message: 'Access denied'
    });
  }

  if (!job_id) {
    return res.status(400).json({
      message: 'job_id is required'
    });
  }

  try {
    // Check whether the job exists and is open
    const jobResult = await pool.query(
      `SELECT id, title
FROM job_postings
WHERE id = $1
AND status = 'open'`,
      [job_id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Job not found or job is closed'
      });
    }

    // Check duplicate application
    const existingApplication = await pool.query(
      `SELECT id
       FROM applications
       WHERE candidate_id = $1
       AND job_id = $2`,
      [id, job_id]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(409).json({
        message: 'Already applied for this job'
      });
    }

    // Try to get match score if one exists (optional, not required)
    const matchResult = await pool.query(
      `SELECT match_score
       FROM job_matches
       WHERE candidate_id = $1
       AND job_id = $2`,
      [id, job_id]
    );

    const matchScore = matchResult.rows.length > 0 ? matchResult.rows[0].match_score : null;

    // Create application with match score (or null if no match exists yet)
    const result = await pool.query(
      `INSERT INTO applications
       (candidate_id, job_id, status, applied_at, match_score)
       VALUES ($1, $2, 'Screening', NOW(), $3)
       RETURNING *`,
      [id, job_id, matchScore]
    );

    // Increase applicant count
    await pool.query(
      `UPDATE job_postings
       SET applicants_count = applicants_count + 1
       WHERE id = $1`,
      [job_id]
    );

    // Notify the HR user who posted this job (single notification, no duplicate)
    await pool.query(
      `INSERT INTO notifications
       (
         user_id,
         user_role,
         title,
         message,
         type
       )
       SELECT
         h.id,
         'hr',
         'New Application Received',
         $1,
         'new_application'
       FROM hrs h
       WHERE h.id = (
         SELECT hr_id
         FROM job_postings
         WHERE id = $2
       )`,
      [
        `A candidate has applied for ${jobResult.rows[0].title}`,
        job_id
      ]
    );

    res.status(201).json({
      message: 'Application submitted successfully',
      application: result.rows[0]
    });

  } catch (err) {
    console.error('Application creation error:', err);

    res.status(500).json({
      message: 'Server error'
    });
  }
});
// GET /api/candidate/:id/applications
// Get candidate applications
router.get('/:id/applications', authenticateToken, async (req, res) => {
  const { id } = req.params;

  if (String(req.user.id) !== String(id)) {
    return res.status(403).json({
      message: 'Access denied'
    });
  }

  // Whitelist allowed sort columns to prevent SQL injection
  const allowedSortColumns = {
    applied_at: 'a.applied_at',
    status: 'a.status',
    title: 'j.title',
    company: 'j.company',
  };

  const sortKey = allowedSortColumns[req.query.sort] || allowedSortColumns.applied_at;
  const sortOrder = req.query.order && req.query.order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  try {
    const result = await pool.query(
      `SELECT
        a.id,
        j.title,
        j.company,
        a.status,
        a.applied_at
       FROM applications a
       JOIN job_postings j
         ON a.job_id = j.id
       WHERE a.candidate_id = $1
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
// GET /api/candidate/:id/interviews
// Get candidate's scheduled interviews
router.get(
  '/:id/interviews',
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;

    if (String(req.user.id) !== String(id)) {
      return res.status(403).json({
        message: 'Access denied'
      });
    }

    try {
      const result = await pool.query(
        `SELECT
          i.id,
          i.interview_date,
          j.title AS job_title,
          j.company
         FROM interviews i
         JOIN job_postings j
           ON i.job_id = j.id
         WHERE i.candidate_id = $1
         ORDER BY i.interview_date ASC`,
        [id]
      );

      res.json(result.rows);

    } catch (err) {
      console.error('Get interviews error:', err);

      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);

module.exports = router;