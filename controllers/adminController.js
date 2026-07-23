const pool = require("../config/db");

const getDashboardStats = async (req, res) => {
  try {

    const users = await pool.query("SELECT COUNT(*) FROM users");

    const jobs = await pool.query("SELECT COUNT(*) FROM jobs");

    const applications = await pool.query(
      "SELECT COUNT(*) FROM applications"
    );

    const resumes = await pool.query(
      "SELECT COUNT(*) FROM resumes"
    );

    const atsScores = await pool.query(
      "SELECT COUNT(*) FROM ats_scores"
    );

    res.status(200).json({
      success: true,
      statistics: {
        totalUsers: users.rows[0].count,
        totalJobs: jobs.rows[0].count,
        totalApplications: applications.rows[0].count,
        totalResumes: resumes.rows[0].count,
        totalATSReports: atsScores.rows[0].count,
      },
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
/// View All Jobs
const getAllJobs = async (req, res) => {
  try {

    const result = await pool.query(
      `SELECT
          job_id,
          job_title,
          description,
          required_skills,
          minimum_experience,
          created_by,
          created_at
       FROM jobs
       ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      jobs: result.rows,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
// Get Candidates with Pagination
const getCandidates = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const offset = (page - 1) * limit;

    // Total candidates
    const totalResult = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM users
      WHERE role = 'CANDIDATE'
      `
    );

    const totalRecords = parseInt(totalResult.rows[0].total);

    // Fetch current page
    const result = await pool.query(
      `
      SELECT
        user_id,
        name,
        email,
        role,
        created_at
      FROM users
      WHERE role = 'CANDIDATE'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.status(200).json({
      success: true,
      data: result.rows,

      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        limit,
      },
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
// Delete Job
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    // Check whether applications exist
    const applications = await pool.query(
      "SELECT * FROM applications WHERE job_id = $1",
      [id]
    );

    if (applications.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete job because candidates have already applied.",
      });
    }

    const result = await pool.query(
      `DELETE FROM jobs
       WHERE job_id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Job deleted successfully",
      job: result.rows[0],
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
  getDashboardStats,
  getAllJobs,
    deleteJob,
    getCandidates,
};