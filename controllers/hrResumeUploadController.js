const pool = require("../config/db");

const {
  parseResume,
  extractSkills,
  getMissingSkills,
  analyzeFormatting,
  computeScore,
} = require("../Services/resumeParserService");

const uploadResumes = async (req, res) => {
  try {

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one resume.",
      });
    }
   const userType = "hr";
const userId = req.user.id;

const subscription = await pool.query(
  `
  SELECT *
  FROM subscriptions
  WHERE user_type = $1
  AND user_id = $2
  `,
  [userType, userId]
);

if (subscription.rows.length === 0) {
  return res.status(404).json({
    success: false,
    message: "Subscription not found.",
  });
}

const currentPlan = subscription.rows[0];

const uploadsNeeded = req.files.length;

if (currentPlan.plan === "FREE") {
  if (currentPlan.uploads_used >= currentPlan.uploads_limit) {
    return res.status(403).json({
      success: false,
      message: "Your free trial has ended. Please upgrade your plan.",
    });
  }
}


    const uploadedResumes = [];

for (const file of req.files) {

  const resumeText = await parseResume(file.path);

  const matchedSkills = extractSkills(resumeText);

  const missingSkills = getMissingSkills(matchedSkills);

  const formatting = analyzeFormatting(resumeText);

  const score = computeScore({
    matchedSkills,
    formatting,
  });

  const resumeHealth = Math.round(
    (formatting.passedCount / formatting.totalChecks) * 100
  );

  const matchSummary =
    `${score.overall}% ATS Match | ${matchedSkills.length} skills matched | ${missingSkills.length} skills missing`;


    const candidateName =
  file.originalname.replace(/\.[^/.]+$/, "");
  const existingResume = await pool.query(
  `
  SELECT resume_id
  FROM resumes
  WHERE file_name = $1
  `,
  [file.originalname]
);

    if (existingResume.rows.length > 0) {
        await pool.query(
`
UPDATE resumes
SET
candidate_name=$1,
file_path=$2,
resume_text=$3,
match_score=$4,
detected_skills=$5,
missing_skills=$6,
resume_health=$7,
match_summary=$8,
uploaded_at=CURRENT_TIMESTAMP
WHERE file_name=$9
`,
[
    candidateName,
    file.path,
    resumeText,
    score.overall,
    JSON.stringify(matchedSkills),
    JSON.stringify(missingSkills),
    resumeHealth,
    matchSummary,
    file.originalname,
]
);
    }
    else
    {
        await pool.query(

  `
  INSERT INTO resumes
  (
    user_id,
    candidate_name,
    file_name,
    file_path,
    resume_text,
    match_score,
    detected_skills,
    missing_skills,
    resume_health,
    match_summary
  )
  VALUES
  ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `,
  [
    null,
    candidateName,
    file.originalname,
    file.path,
    resumeText,
    score.overall,
    JSON.stringify(matchedSkills),
    JSON.stringify(missingSkills),
    resumeHealth,
    matchSummary,
  ]
);
    }

    uploadedResumes.push({
  candidate_name: candidateName,
  file_name: file.originalname,
  match_score: score.overall,
  resume_health: resumeHealth,
  match_summary: matchSummary,
  detected_skills: matchedSkills,
  missing_skills: missingSkills,
});
}

    return res.status(200).json({
  success: true,
  message: "Resumes uploaded successfully.",
  resumes: uploadedResumes,
});
await pool.query(
  `
  UPDATE subscriptions
  SET uploads_used = uploads_used + $1
  WHERE user_type = $2
  AND user_id = $3
  `,
  [
    req.files.length,
    userType,
    userId,
  ]
);
  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};

module.exports = {
  uploadResumes,
};