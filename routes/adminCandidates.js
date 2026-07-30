const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/admin/candidates
// Returns all candidates with their applied role, match score, and status
router.get('/candidates', authenticateToken, requireAdmin, async (req, res) => {
  // Whitelist allowed sort columns to prevent SQL injection
  const allowedSortColumns = {
    match_score: 'a.match_score',
    name: 'c.name',
    role_applied: 'j.title',
    status: 'a.status',
  };

  const sortKey = allowedSortColumns[req.query.sort] || allowedSortColumns.match_score;
  const sortOrder = req.query.order && req.query.order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  try {
    const result = await pool.query(
      `SELECT 
         a.id AS application_id,
         c.id AS candidate_id,
         c.name,
         j.title AS role_applied,
         a.match_score,
         a.status
       FROM applications a
       JOIN candidates c ON a.candidate_id = c.id
       JOIN job_postings j ON a.job_id = j.id
       WHERE a.match_score IS NOT NULL
       ORDER BY ${sortKey} ${sortOrder}`
    );
    res.json(result.rows);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/candidates/:applicationId/advance
// Moves a candidate to the next pipeline stage
router.patch('/candidates/:applicationId/advance', authenticateToken, requireAdmin, async (req, res) => {
  const { applicationId } = req.params;

  // Define the pipeline order
const stageOrder = ['Applied', 'Screening', 'Interview Scheduled', 'Offer Sent', 'Hired'];

  try {
    const current = await pool.query(
      `SELECT status FROM applications WHERE id = $1`,
      [applicationId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }
    const currentStatus = current.rows[0].status;
    const currentIndex = stageOrder.indexOf(currentStatus);

    if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
      return res.status(400).json({ message: 'Candidate cannot be advanced further' });
    }
    const nextStatus = stageOrder[currentIndex + 1];

    const updated = await pool.query(
  `UPDATE applications SET status = $1 WHERE id = $2 RETURNING *`,
  [nextStatus, applicationId]
);

const updatedApp = updated.rows[0];

// Create real hiring statistics when candidate becomes Hired
if (nextStatus === 'Hired') {
  const hiringData = await pool.query(
    `SELECT job_id, applied_at
     FROM applications
     WHERE id = $1`,
    [applicationId]
  );

  const { job_id, applied_at } = hiringData.rows[0];

  const hireDate = new Date();

  const daysToHire = Math.max(
    0,
    Math.ceil(
      (hireDate - new Date(applied_at)) /
      (1000 * 60 * 60 * 24)
    )
  );

  await pool.query(
    `INSERT INTO hiring_stats
     (job_id, days_to_hire, hire_date)
     VALUES ($1, $2, $3)`,
    [job_id, daysToHire, hireDate]
  );
}

// Send candidate notification
await pool.query(
  `INSERT INTO notifications
   (user_id, user_role, title, message, type, is_read)
   VALUES ($1, 'candidate', 'Application Status Updated', $2, 'status_update', false)`,
  [
    updatedApp.candidate_id,
    `Your application status changed to: ${nextStatus}`
  ]
);

res.json(updatedApp);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/candidates/:applicationId/reject
// Marks a candidate as rejected
router.patch('/candidates/:applicationId/reject', authenticateToken, requireAdmin, async (req, res) => {
  const { applicationId } = req.params;
  try {
    const updated = await pool.query(
      `UPDATE applications SET status = 'Rejected' WHERE id = $1 RETURNING *`,
      [applicationId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }
    const rejectedApp = updated.rows[0];
    await pool.query(
      `INSERT INTO notifications (user_id, user_role, title, message, type, is_read)
       VALUES ($1, 'candidate', 'Application Rejected', $2, 'status_update', false)`,
      [rejectedApp.candidate_id, `Your application was not selected to move forward.`]
    );
    res.json(rejectedApp);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// POST /api/admin/candidates/:applicationId/interview
// Schedule an interview for a candidate
router.post(
  '/candidates/:applicationId/interview',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const { applicationId } = req.params;
    const { interview_date } = req.body;

    if (!interview_date) {
      return res.status(400).json({
        message: 'interview_date is required'
      });
    }

    try {
      const application = await pool.query(
        `SELECT candidate_id, job_id
         FROM applications
         WHERE id = $1`,
        [applicationId]
      );

      if (application.rows.length === 0) {
        return res.status(404).json({
          message: 'Application not found'
        });
      }

      const {
        candidate_id,
        job_id
      } = application.rows[0];

      const result = await pool.query(
        `INSERT INTO interviews
         (candidate_id, job_id, interview_date)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [
          candidate_id,
          job_id,
          interview_date
        ]
      );

      res.status(201).json({
        message: 'Interview scheduled successfully',
        interview: result.rows[0]
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