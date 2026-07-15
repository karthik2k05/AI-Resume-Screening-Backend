const pool = require("../config/db");

// Get all applicants for a specific job
const getApplicantsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const result = await pool.query(
      `SELECT
          a.application_id,
          u.name,
          r.file_name,
          s.overall_score,
          a.status,
          a.applied_at
       FROM applications a
       JOIN users u
         ON a.user_id = u.user_id
       JOIN resumes r
         ON a.resume_id = r.resume_id
       LEFT JOIN ats_scores s
         ON a.application_id = s.application_id
       WHERE a.job_id = $1
       ORDER BY s.overall_score DESC NULLS LAST`,
      [jobId]
    );

    res.status(200).json({
      success: true,
      applicants: result.rows,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
// Shortlist Candidate
const shortlistCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE applications
       SET status = 'SHORTLISTED'
       WHERE application_id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Candidate shortlisted successfully",
      application: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
// Reject Candidate
const rejectCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE applications
       SET status = 'REJECTED'
       WHERE application_id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Candidate rejected successfully",
      application: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
// Top Candidates
const getTopCandidates = async (req, res) => {
  try {

    const result = await pool.query(
      `SELECT
          u.name,
          j.job_title,
          s.overall_score,
          a.status
      FROM ats_scores s
      JOIN applications a
          ON s.application_id = a.application_id
      JOIN users u
          ON a.user_id = u.user_id
      JOIN jobs j
          ON a.job_id = j.job_id
      ORDER BY s.overall_score DESC`
    );

    res.status(200).json({
      success: true,
      candidates: result.rows,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
// Filter Candidates by ATS Score
const filterCandidates = async (req, res) => {
  try {
    const { score } = req.query;

    const result = await pool.query(
      `SELECT
          u.name,
          j.job_title,
          s.overall_score,
          a.status
       FROM ats_scores s
       JOIN applications a
         ON s.application_id = a.application_id
       JOIN users u
         ON a.user_id = u.user_id
       JOIN jobs j
         ON a.job_id = j.job_id
       WHERE s.overall_score >= $1
       ORDER BY s.overall_score DESC`,
      [score]
    );

    res.status(200).json({
      success: true,
      candidates: result.rows,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getApplicantsByJob,
  shortlistCandidate,
  rejectCandidate,
  getTopCandidates,
  filterCandidates,
};


