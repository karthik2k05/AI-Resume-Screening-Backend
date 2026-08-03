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
///getAdminOverview
const getAdminOverview = async (req, res) => {
  try {
    const [
      totalApplicants,
      activeJobPostings,
      totalJobPostings,
      totalApplications,
      averageATS,
      applicantTrend,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS count
         FROM users
         WHERE role = 'CANDIDATE'`
      ),

      pool.query(
        `SELECT COUNT(*) AS count
         FROM job_postings
         WHERE LOWER(status) = 'open'`
      ),

      pool.query(
        `SELECT COUNT(*) AS count
         FROM job_postings`
      ),

      pool.query(
        `SELECT COUNT(*) AS count
         FROM applications`
      ),

      pool.query(
        `SELECT COALESCE(ROUND(AVG(overall_score),2),0) AS average
         FROM ats_scores`
      ),

      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', applied_at), 'Mon') AS month,
          COUNT(*)::int AS applicants
        FROM applications
        GROUP BY DATE_TRUNC('month', applied_at)
        ORDER BY DATE_TRUNC('month', applied_at)
      `),
    ]);

    res.status(200).json({
      success: true,

      statistics: {
        totalApplicants: Number(totalApplicants.rows[0].count),
        activeJobPostings: Number(activeJobPostings.rows[0].count),
        totalJobPostings: Number(totalJobPostings.rows[0].count),
        totalApplications: Number(totalApplications.rows[0].count),
        averageATSScore: Number(averageATS.rows[0].average),
      },

      applicantTrend: applicantTrend.rows,
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
    u.user_id,
    u.name,
    u.email,

    jp.title AS role,

    COALESCE(a.status,'Registered') AS status,

    COALESCE(r.match_score,0) AS score

FROM users u

LEFT JOIN LATERAL (
    SELECT *
    FROM resumes
    WHERE user_id = u.user_id
    ORDER BY uploaded_at DESC
    LIMIT 1
) r ON true

LEFT JOIN LATERAL (
    SELECT *
    FROM applications
    WHERE user_id = u.user_id
    ORDER BY applied_at DESC
    LIMIT 1
) a ON true

LEFT JOIN job_postings jp
ON a.job_id = jp.id

WHERE u.role='CANDIDATE'

ORDER BY u.created_at DESC

LIMIT $1 OFFSET $2
`,
[limit,offset]
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
  getAdminOverview,
  getAllJobs,
    deleteJob,
    getCandidates,
};