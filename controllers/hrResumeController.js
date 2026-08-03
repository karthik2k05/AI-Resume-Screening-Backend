const pool = require("../config/db");

const getAllResumes = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        resume_id,
        user_id,
        candidate_name,
        file_name,
        resume_text,
        detected_skills,
        missing_skills,
        match_score,
        resume_health,
        uploaded_at
      FROM resumes
      ORDER BY uploaded_at DESC
    `);

    const resumes = result.rows.map((row) => ({
      ...row,
      detected_skills: row.detected_skills
        ? JSON.parse(row.detected_skills)
        : [],
      missing_skills: row.missing_skills
        ? JSON.parse(row.missing_skills)
        : [],
    }));

    res.json({
      success: true,
      resumes,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};

const deleteResume = async (req, res) => {
  try {

    const { resumeId } = req.params;

// Delete ATS scores first
await pool.query(
  `
  DELETE FROM ats_scores
  WHERE application_id IN (
    SELECT application_id
    FROM applications
    WHERE resume_id = $1
  )
  `,
  [resumeId]
);

// Delete applications
await pool.query(
  `
  DELETE FROM applications
  WHERE resume_id = $1
  `,
  [resumeId]
);

// Delete resume
const deleted = await pool.query(
  `
  DELETE FROM resumes
  WHERE resume_id = $1
  RETURNING *
  `,
  [resumeId]
);

    if (deleted.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    return res.json({
      success: true,
      message: "Resume deleted successfully",
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const deleteAllResumes = async (req, res) => {
  try {

    // Delete ATS scores first
    await pool.query(`
      DELETE FROM ats_scores
    `);

    // Delete all applications
    await pool.query(`
      DELETE FROM applications
    `);

    // Delete all resumes
    await pool.query(`
      DELETE FROM resumes
    `);

    return res.status(200).json({
      success: true,
      message: "All resumes deleted successfully.",
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const getAllApplications = async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        a.application_id,
        a.status,
        a.match_score,
        a.applied_at,

        r.resume_id,
        r.candidate_name,
        r.file_name,
        r.resume_health,
        r.match_summary,

        jp.id AS job_id,
        jp.title,
        jp.company,
        jp.department,
        jp.location

      FROM applications a

      INNER JOIN resumes r
        ON a.resume_id = r.resume_id

      INNER JOIN job_postings jp
        ON a.job_id = jp.id

      ORDER BY a.applied_at DESC
    `);

    return res.status(200).json({
      success: true,
      applications: result.rows,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const updateApplicationStatus = async (
  req,
  res,
  status
) => {
  try {

    const { applicationId } = req.params;

    const result = await pool.query(
      `
      UPDATE applications
      SET status=$1
      WHERE application_id=$2
      RETURNING *
      `,
      [status, applicationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Application ${status.toLowerCase()} successfully.`,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const shortlistApplication = (req, res) =>
  updateApplicationStatus(req, res, "Shortlisted");

const rejectApplication = (req, res) =>
  updateApplicationStatus(req, res, "Rejected");

const interviewApplication = (req, res) =>
  updateApplicationStatus(req, res, "Interview");

const getApplicationDetails = async (req, res) => {
  try {

    const { applicationId } = req.params;

    const result = await pool.query(
      `
      SELECT

        a.application_id,
        a.status,
        a.match_score,
        a.applied_at,

        r.resume_id,
        r.candidate_name,
        r.file_name,
        r.resume_text,
        r.detected_skills,
        r.missing_skills,
        r.resume_health,
        r.match_summary,

        jp.id AS job_id,
        jp.title,
        jp.company,
        jp.department,
        jp.location,
        jp.description

      FROM applications a

      INNER JOIN resumes r
        ON a.resume_id = r.resume_id

      INNER JOIN job_postings jp
        ON a.job_id = jp.id

      WHERE a.application_id = $1
      `,
      [applicationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    const application = result.rows[0];

    application.detected_skills =
      application.detected_skills
        ? JSON.parse(application.detected_skills)
        : [];

    application.missing_skills =
      application.missing_skills
        ? JSON.parse(application.missing_skills)
        : [];

    return res.status(200).json({
      success: true,
      application,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};

const getDashboard = async (req, res) => {
  try {

    const totalApplicants = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM applications
    `);

    const activeJobPostings = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM job_postings
      WHERE LOWER(status)='open'
    `);

    const interviewsThisWeek = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM applications
      WHERE status='Interview'
      AND applied_at >= NOW() - INTERVAL '7 days'
    `);

    const averageATSScore = await pool.query(`
      SELECT
      ROUND(AVG(match_score),2) AS average
      FROM applications
    `);

    const applicantTrend = await pool.query(`
      SELECT
      TO_CHAR(applied_at,'Mon') AS month,
      COUNT(*)::int AS applicants
      FROM applications
      GROUP BY
      TO_CHAR(applied_at,'Mon'),
      DATE_TRUNC('month',applied_at)
      ORDER BY
      DATE_TRUNC('month',applied_at)
    `);

    const hiringFunnel = await pool.query(`
      SELECT
      status,
      COUNT(*)::int AS count
      FROM applications
      GROUP BY status
    `);

    return res.json({
      success: true,

      statistics: {

        totalApplicants:
          totalApplicants.rows[0].count,

        activeJobPostings:
          activeJobPostings.rows[0].count,

        interviewsThisWeek:
          interviewsThisWeek.rows[0].count,

        averageATSScore:
          Number(
            averageATSScore.rows[0].average || 0
          ),

      },

      applicantTrend:
        applicantTrend.rows,

      hiringFunnel:
        hiringFunnel.rows,

    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      success:false,

      message:"Internal Server Error",

    });

  }
};
const getAnalytics = async (req, res) => {
  try {

    const [
      totalApplicants,
      activeJobs,
      interviews,
      averageATS,
      monthlyApplicants,
      hiringFunnel,
      departmentApplications,
      topJobs,
    ] = await Promise.all([

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM applications
      `),

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM job_postings
        WHERE LOWER(status)='open'
      `),

      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM applications
        WHERE status='Interview'
      `),

      pool.query(`
        SELECT
        ROUND(AVG(match_score),2) AS average
        FROM applications
      `),

      pool.query(`
        SELECT
        TO_CHAR(applied_at,'Mon') AS month,
        COUNT(*)::int AS applicants
        FROM applications
        GROUP BY
        DATE_TRUNC('month',applied_at),
        TO_CHAR(applied_at,'Mon')
        ORDER BY
        DATE_TRUNC('month',applied_at)
      `),

      pool.query(`
        SELECT
        status,
        COUNT(*)::int AS count
        FROM applications
        GROUP BY status
      `),

      pool.query(`
        SELECT
        jp.department,
        COUNT(a.application_id)::int AS applicants

        FROM job_postings jp

        LEFT JOIN applications a
        ON jp.id=a.job_id

        GROUP BY jp.department

        ORDER BY applicants DESC
      `),

      pool.query(`
        SELECT
        jp.title,
        COUNT(a.application_id)::int AS applicants

        FROM job_postings jp

        LEFT JOIN applications a
        ON jp.id=a.job_id

        GROUP BY jp.title

        ORDER BY applicants DESC
      `)

    ]);

    res.json({

      success:true,

      statistics:{

        totalApplicants:
        totalApplicants.rows[0].count,

        activeJobs:
        activeJobs.rows[0].count,

        interviews:
        interviews.rows[0].count,

        averageATS:
        Number(
          averageATS.rows[0].average || 0
        )

      },

      monthlyApplicants:
      monthlyApplicants.rows,

      hiringFunnel:
      hiringFunnel.rows,

      departmentApplications:
      departmentApplications.rows,

      topJobs:
      topJobs.rows

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({

      success:false,

      message:"Internal Server Error"

    });

  }
};

module.exports = {
    getAllResumes,
    deleteResume,
    deleteAllResumes,
    getAllApplications,
    shortlistApplication,
    rejectApplication,
    interviewApplication,
    getApplicationDetails,
    getDashboard,
    getAnalytics,
};
