const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, requireHR } = require('../middleware/authMiddleware');

// GET /api/hr/overview
router.get('/overview', authenticateToken, requireHR, async (req, res) => {
  try {
    const totalApplicants = await pool.query(
      `SELECT COUNT(*) FROM applications`
    );

    const activeJobs = await pool.query(
      `SELECT COUNT(*) 
       FROM job_postings
       WHERE status = 'open'`
    );

    const interviewsThisWeek = await pool.query(
      `SELECT COUNT(*) FROM interviews
       WHERE interview_date BETWEEN CURRENT_DATE
       AND CURRENT_DATE + INTERVAL '7 days'`
    );

    const avgTimeToHire = await pool.query(
      `SELECT ROUND(AVG(days_to_hire)) AS avg_days
       FROM hiring_stats`
    );

    res.json({
      totalApplicants: parseInt(
        totalApplicants.rows[0].count
      ),

      activeJobPostings: parseInt(
        activeJobs.rows[0].count
      ),

      interviewsThisWeek: parseInt(
        interviewsThisWeek.rows[0].count
      ),

      avgTimeToHire:
        parseInt(avgTimeToHire.rows[0].avg_days) || 0,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Server error'
    });
  }
});

// GET /api/hr/applicant-growth
router.get(
  '/applicant-growth',
  authenticateToken,
  requireHR,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
           TO_CHAR(applied_at, 'Mon') AS month,
           COUNT(*) AS applicant_count
         FROM applications
         GROUP BY TO_CHAR(applied_at, 'Mon'), DATE_TRUNC('month', applied_at)
         ORDER BY DATE_TRUNC('month', applied_at) ASC`
      );

      res.json(result.rows.map(row => ({
        month: row.month,
        applicant_count: parseInt(row.applicant_count)
      })));
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);

// GET /api/hr/applicant-sources
router.get(
  '/applicant-sources',
  authenticateToken,
  requireHR,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
           source AS source_name,
           ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage
         FROM candidates
         GROUP BY source
         ORDER BY percentage DESC`
      );

      res.json(result.rows.map(row => ({
        source_name: row.source_name,
        percentage: parseFloat(row.percentage)
      })));
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);

module.exports = router;