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
    const resumeHealth = Math.round(
  (formatting.passedCount / formatting.totalChecks) * 100
);
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
candidate_name=$1,
file_name=$2,
file_path=$3,
resume_text=$4,
match_score=$5,
resume_health=$6,
detected_skills=$7,
missing_skills=$8,
uploaded_at=CURRENT_TIMESTAMP
WHERE user_id=$9
    `,
    [
      req.user.name,
      req.file.originalname,
      req.file.path,
      resumeText,
      score.overall,
      resumeHealth,
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
      resume_text,
      match_score,
      resume_health,
      detected_skills,
      missing_skills
    )
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `,
    [
      userId,
      req.user.name,
      req.file.originalname,
      req.file.path,
      resumeText,
      resumeHealth,
      score.overall,
      JSON.stringify(matchedSkills),
      JSON.stringify(missingSkills),
    ]
  );

}
return res.status(200).json({
  success: true,
  message: "Resume uploaded successfully.",
  resume: {
    score: {
      overall: score.overall,
    },
    matchedSkills,
    missingSkills,
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

const getMyApplications = async (req, res) => {
  try {

    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        a.application_id,
        j.job_title,
        j.company_name,
        a.status,
        a.match_score,
        a.applied_at
      FROM applications a
      INNER JOIN jobs j
        ON a.job_id = j.job_id
      WHERE a.user_id = $1
      ORDER BY a.applied_at DESC
      `,
      [userId]
    );

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

const getLatestResume = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT *
      FROM resumes
      WHERE user_id = $1
      ORDER BY uploaded_at DESC
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No resume found.",
      });
    }

    const resume = result.rows[0];

    return res.status(200).json({
      success: true,
      resume: {
        score: {
          overall: resume.match_score,
        },
        matchedSkills: JSON.parse(resume.detected_skills || "[]"),
        missingSkills: JSON.parse(resume.missing_skills || "[]"),
        formatting: analyzeFormatting(
          await parseResume(resume.file_path)
        ),
        text: resume.resume_text,
      },
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const getJobs = async (req, res) => {
  try {

    const result = await pool.query(
      `
      SELECT
        job_id,
        job_title,
        company_name,
        description,
        required_skills,
        minimum_experience,
        created_at
      FROM jobs
      ORDER BY created_at DESC
      `
    );

    return res.status(200).json({
      success: true,
      jobs: result.rows,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const applyJob = async (req, res) => {
  try {

    const userId = req.user.id;
    const { job_id } = req.body;

    if (!job_id) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required.",
      });
    }

    // Check whether the candidate uploaded a resume
    const resumeResult = await pool.query(
      `
      SELECT
        resume_id,
        match_score
      FROM resumes
      WHERE user_id = $1
      `,
      [userId]
    );

    if (resumeResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload your resume before applying.",
      });
    }

    const resume = resumeResult.rows[0];

    // Prevent duplicate applications
    const existingApplication = await pool.query(
      `
      SELECT application_id
      FROM applications
      WHERE
        user_id = $1
        AND job_id = $2
      `,
      [userId, job_id]
    );

    if (existingApplication.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this job.",
      });
    }

    // Verify job exists
    const jobResult = await pool.query(
      `
      SELECT job_id
      FROM jobs
      WHERE job_id = $1
      `,
      [job_id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    // Insert application
    await pool.query(
      `
      INSERT INTO applications
      (
        user_id,
        resume_id,
        job_id,
        match_score,
        status
      )
      VALUES
      ($1,$2,$3,$4,$5)
      `,
      [
        userId,
        resume.resume_id,
        job_id,
        resume.match_score,
        "Applied",
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
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
  getMyApplications,
  getLatestResume,
  getJobs,
  applyJob,
};