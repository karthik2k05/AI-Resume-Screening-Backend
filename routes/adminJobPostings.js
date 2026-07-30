const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const {
  authenticateToken,
  requireAdmin
} = require('../middleware/authMiddleware');

// GET /api/admin/job-postings
// Get all job postings with sorting
router.get('/job-postings', authenticateToken, requireAdmin, async (req, res) => {
  // Whitelist allowed sort columns to prevent SQL injection
  const allowedSortColumns = {
    posted_date: 'posted_date',
    applicants_count: 'applicants_count',
    title: 'title',
    status: 'status',
    company: 'company'
  };

  const sortKey =
    allowedSortColumns[req.query.sort] ||
    allowedSortColumns.posted_date;

  const sortOrder =
    req.query.order &&
    req.query.order.toLowerCase() === 'asc'
      ? 'ASC'
      : 'DESC';

  try {
    const result = await pool.query(
      `SELECT
        id,
        title,
        company,
        location,
        status,
        posted_date,
        applicants_count,
        description,
        required_skills
       FROM job_postings
       ORDER BY ${sortKey} ${sortOrder}`
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Server error'
    });
  }
});


// GET /api/admin/job-postings/open-count
// Get count of open jobs
router.get(
  '/job-postings/open-count',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT COUNT(*)
         FROM job_postings
         WHERE status = 'open'`
      );

      res.json({
        openCount: parseInt(result.rows[0].count)
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);


// POST /api/admin/job-postings
// Create a new job posting
router.post(
  '/job-postings',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const {
      title,
      company,
      location,
      description,
      required_skills
    } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO job_postings
         (
           title,
           company,
           location,
           description,
           status,
           posted_date,
           required_skills
         )
         VALUES ($1, $2, $3, $4, 'open', CURRENT_DATE, $5)
         RETURNING *`,
        [
          title,
          company,
          location,
          description,
          required_skills
        ]
      );
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
     id,
     'admin',
     'New Job Posted',
     $1,
     'new_job'
   FROM users
   WHERE role = 'admin'`,
  [
    `A new job "${title}" has been posted by HR`
  ]
);

      res.status(201).json(result.rows[0]);

    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);


// PATCH /api/admin/job-postings/:id
// Update job details, status, and required skills
router.patch(
  '/job-postings/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;

    const {
      title,
      company,
      location,
      description,
      status,
      required_skills
    } = req.body;

    try {
      const result = await pool.query(
        `UPDATE job_postings
         SET title = COALESCE($1, title),
             company = COALESCE($2, company),
             location = COALESCE($3, location),
             description = COALESCE($4, description),
             status = COALESCE($5, status),
             required_skills = COALESCE($6, required_skills)
         WHERE id = $7
         RETURNING *`,
        [
          title,
          company,
          location,
          description,
          status,
          required_skills,
          id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Job posting not found'
        });
      }

      res.json(result.rows[0]);

    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);


// DELETE /api/admin/job-postings/:id
// Delete a job posting
router.delete(
  '/job-postings/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        `DELETE FROM job_postings
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'Job posting not found'
        });
      }

      res.json({
        message: 'Job posting deleted',
        deleted: result.rows[0]
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);


module.exports = router;