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
  const uploadsUsed = Number(currentPlan.uploads_used || 0);
  const uploadsLimit = Number(currentPlan.uploads_limit || 10);

  const remainingUploads = uploadsLimit - uploadsUsed;

  // Already reached the limit
  if (remainingUploads <= 0) {
    return res.status(403).json({
      success: false,
      message:
        "Your free trial has ended. Please upgrade your plan for unlimited uploads.",
    });
  }

  // Trying to upload more than remaining
  if (uploadsNeeded > remainingUploads) {
    return res.status(403).json({
      success: false,
      message: `You have only ${remainingUploads} free upload(s) remaining.`,
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
  AND hr_id = $2 -- NEW: Check for the same HR
  `,
  [file.originalname, userId] // NEW: Pass logged-in HR ID
);

    if (existingResume.rows.length > 0) {
       await pool.query(
`
UPDATE resumes
SET
hr_id=$1, -- NEW: Save the HR ID
candidate_name=$2,
file_path=$3,
resume_text=$4,
match_score=$5,
detected_skills=$6,
missing_skills=$7,
resume_health=$8,
match_summary=$9,
uploaded_at=CURRENT_TIMESTAMP
WHERE file_name=$10
`,
[
    userId, // NEW: Logged-in HR ID
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
  hr_id, 
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
($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `,
  [
  null,
  userId, // NEW: Logged-in HR ID
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
if (currentPlan.plan === "FREE") {

  // Count actual resumes currently uploaded by this HR
  const resumeCount = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM resumes
    WHERE hr_id = $1
    `,
    [userId]
  );

  // Keep subscription count equal to actual stored resumes
  await pool.query(
    `
    UPDATE subscriptions
    SET uploads_used = $1
    WHERE user_type = $2
    AND user_id = $3
    `,
    [
      resumeCount.rows[0].count,
      userType,
      userId,
    ]
  );
}

return res.status(200).json({
  success: true,
  message: "Resumes uploaded successfully.",
  resumes: uploadedResumes,
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
  uploadResumes,
};