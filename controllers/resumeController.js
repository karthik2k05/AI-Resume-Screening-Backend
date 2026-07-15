const pool = require("../config/db");

// ================= Upload Resume =================

const uploadResume = async (req, res) => {
  try {

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF or DOCX file",
      });
    }

    // Logged-in user ID (from JWT)
    const userId = req.user.id;

    // File details
    const fileName = req.file.originalname;
    const filePath = req.file.path;

    // Save in database
    const result = await pool.query(
      `INSERT INTO resumes (user_id, file_name, file_path)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, fileName, filePath]
    );

    return res.status(201).json({
      success: true,
      message: "Resume uploaded successfully",
      resume: result.rows[0],
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
  uploadResume,
};