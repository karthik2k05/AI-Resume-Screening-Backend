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

module.exports = {
    getAllResumes,
};
