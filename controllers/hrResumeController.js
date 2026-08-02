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

module.exports = {
    getAllResumes,
    deleteResume,
};
