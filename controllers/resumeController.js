const pool = require("../config/db");
const fs = require("fs");
const path = require("path");

const { analyzeResume } = require("../lib/resumeParser");

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required",
      });
    }

    // Analyze Resume
    const analysis = await analyzeResume(
      req.file.originalname,
      req.file.buffer
    );
    const summary = `
ATS Score: ${analysis.score.overall}

Matched Skills:
${analysis.matchedSkills.map(s => s.skill).join(", ")}

Missing Skills:
${analysis.missingSkills.join(", ")}
`;

    // Create uploads folder if not exists
    const uploadDir = path.join(__dirname, "../uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    // Generate filename
    const fileName = `${Date.now()}_${req.file.originalname}`;

    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, req.file.buffer);

    // Insert Resume

    const resumeResult = await pool.query(
      `
      INSERT INTO resumes
      (
        user_id,
        candidate_name,
        file_name,
        file_path,
        match_score,
        match_summary
      )

      VALUES($1,$2,$3,$4,$5,$6)

      RETURNING resume_id
      `,
      [
        null,
        analysis.candidateName,
        req.file.originalname,
        `uploads/${fileName}`,
        analysis.score.overall,
        summary,
      ]
    );

    const resumeId = resumeResult.rows[0].resume_id;

    // Insert Skills

    for (const skill of analysis.matchedSkills) {
      await pool.query(
        `
        INSERT INTO skill_matches
        (
            resume_id,
            skill_name,
            match_percentage
        )

        VALUES($1,$2,$3)
        `,
        [
          resumeId,
          skill.skill,
          skill.value,
        ]
      );
    }

    return res.status(201).json({
      success: true,
      message: "Resume uploaded successfully",
      analysis,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });

  }
};