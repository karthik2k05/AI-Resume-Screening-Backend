const pool = require("../config/db");
const path = require("path");

const {
  parseResume,
  extractSkills,
  getMissingSkills,
  analyzeFormatting,
  computeScore,
} = require("../Services/resumeParserService");

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
  return res.status(400).json({
    success: false,
    message: "Please upload a resume.",
  });
}
    const userId = req.user.id;
    const resumeText = await parseResume(req.file.path);
    const matchedSkills = extractSkills(resumeText);

    const missingSkills = getMissingSkills(matchedSkills);

    const formatting = analyzeFormatting(resumeText);

    const score = computeScore({
        matchedSkills,
        formatting,
    });
    const existingResume = await pool.query(
  `
  SELECT resume_id
  FROM resumes
  WHERE user_id=$1
  `,
  [userId]
);
if (existingResume.rows.length > 0) {

  await pool.query(
    `
    UPDATE resumes
    SET
      candidate_name = $1,
      file_name = $2,
      file_path = $3,
      match_score = $4,
      detected_skills = $5,
      missing_skills = $6,
      uploaded_at = CURRENT_TIMESTAMP
    WHERE user_id = $7
    `,
    [
      req.user.name,
      req.file.originalname,
      req.file.path,
      score.overall,
      JSON.stringify(matchedSkills),
      JSON.stringify(missingSkills),
      userId,
    ]
  );

}else {

  await pool.query(
    `
    INSERT INTO resumes
    (
      user_id,
      candidate_name,
      file_name,
      file_path,
      match_score,
      detected_skills,
      missing_skills
    )
    VALUES
    ($1,$2,$3,$4,$5,$6,$7)
    `,
    [
      userId,
      req.user.name,
      req.file.originalname,
      req.file.path,
      score.overall,
      JSON.stringify(matchedSkills),
      JSON.stringify(missingSkills),
    ]
  );

}
    return res.status(200).json({
  success: true,
  message: "Resume uploaded successfully.",
  data: {
    overallScore: score.overall,
    detectedSkills: matchedSkills,
    missingSkills: missingSkills,
    formatting,
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
module.exports = {
  uploadResume,
};