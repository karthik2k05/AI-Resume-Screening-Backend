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

module.exports = {
    getAllResumes,
    deleteResume,
    deleteAllResumes,
    getAllApplications,
    shortlistApplication,
    rejectApplication,
    interviewApplication,
    getApplicationDetails,
};
