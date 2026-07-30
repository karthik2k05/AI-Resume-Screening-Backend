const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireHR } = require('../middleware/authMiddleware');

// GET /api/hr/candidates
// Returns all candidates with their applied role, match score, and status
router.get('/candidates', authenticateToken, requireHR, async (req, res) => {
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

// PATCH /api/hr/candidates/:applicationId/advance
// Moves a candidate to the next pipeline stage
router.patch(
  '/candidates/:applicationId/advance',
  authenticateToken,
  requireHR,
  async (req, res) => {
    const { applicationId } = req.params;

    const stageOrder = [
      'Applied',
      'Screening',
      'Interview Scheduled',
      'Offer Sent',
      'Hired'
    ];

    try {
      const current = await pool.query(
        `SELECT status
         FROM applications
         WHERE id = $1`,
        [applicationId]
      );

      if (current.rows.length === 0) {
        return res.status(404).json({
          message: 'Application not found'
        });
      }

      const currentStatus = current.rows[0].status;
      const currentIndex = stageOrder.indexOf(currentStatus);

      if (
        currentIndex === -1 ||
        currentIndex === stageOrder.length - 1
      ) {
        return res.status(400).json({
          message: 'Candidate cannot be advanced further'
        });
      }

      const nextStatus = stageOrder[currentIndex + 1];

      const updated = await pool.query(
        `UPDATE applications
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [nextStatus, applicationId]
      );

      const updatedApp = updated.rows[0];

      // Create hiring statistics when candidate becomes Hired
      if (nextStatus === 'Hired') {
        console.log("Hired block executed");

        const hiringData = await pool.query(
          `SELECT candidate_id, applied_at
           FROM applications
           WHERE id = $1`,
          [applicationId]
        );

        const {
          candidate_id,
          applied_at
        } = hiringData.rows[0];

        const hiredAt = new Date();

        const daysToHire = Math.ceil(
          (hiredAt - new Date(applied_at)) /
          (1000 * 60 * 60 * 24)
        );

        try {

  // Check if this candidate is already in hiring_stats
  const existingHire = await pool.query(
    `SELECT id
     FROM hiring_stats
     WHERE candidate_id = $1`,
    [candidate_id]
  );

  if (existingHire.rows.length === 0) {

    await pool.query(
      `INSERT INTO hiring_stats
       (candidate_id, days_to_hire, hired_at)
       VALUES ($1, $2, $3)`,
      [
        candidate_id,
        daysToHire,
        hiredAt
      ]
    );

    console.log("Hiring stats inserted successfully");

  } else {

    console.log("Hiring stats already exist for this candidate");

  }

} catch (err) {
  console.error("Hiring stats insert error:", err.message);
}
      }

      // Candidate notification
      await pool.query(
        `INSERT INTO notifications
         (
           user_id,
           user_role,
           title,
           message,
           type,
           is_read
         )
         VALUES
         (
           $1,
           'candidate',
           'Application Status Updated',
           $2,
           'status_update',
           false
         )`,
        [
          updatedApp.candidate_id,
          `Your application status changed to: ${nextStatus}`
        ]
      );

      res.json(updatedApp);

    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);

// PATCH /api/hr/candidates/:applicationId/reject
// Marks a candidate as rejected
router.patch('/candidates/:applicationId/reject', authenticateToken, requireHR, async (req, res) => {
  const { applicationId } = req.params;

  try {
    const updated = await pool.query(
      `UPDATE applications
       SET status = 'Rejected'
       WHERE id = $1
       RETURNING *`,
      [applicationId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({
        message: 'Application not found'
      });
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
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// POST /api/hr/candidates/:applicationId/interview
// Schedule an interview for a candidate
router.post(
  '/candidates/:applicationId/interview',
  authenticateToken,
  requireHR,
  async (req, res) => {
    const { applicationId } = req.params;
    const { interview_date } = req.body;

    if (!interview_date) {
      return res.status(400).json({
        message: 'interview_date is required'
      });
    }

    try {
      // 1. Get candidate and job details
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

      // 2. Schedule interview
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

      // 3. Update application status
      await pool.query(
        `UPDATE applications
         SET status = 'Interview Scheduled'
         WHERE id = $1`,
        [applicationId]
      );

      // 4. Get job title
      const jobResult = await pool.query(
        `SELECT title
         FROM job_postings
         WHERE id = $1`,
        [job_id]
      );

      const jobTitle = jobResult.rows[0]?.title || 'your applied job';

      // 5. Create notification for candidate
      await pool.query(
        `INSERT INTO notifications
         (
           user_id,
           user_role,
           title,
           message,
           type
         )
         VALUES ($1, 'candidate', $2, $3, 'interview_scheduled')`,
        [
          candidate_id,
          'Interview Scheduled',
          `Your interview for ${jobTitle} has been scheduled on ${interview_date}`
        ]
      );

      // 6. Send response
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