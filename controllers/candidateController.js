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
const matchSummary = `${score.overall}% ATS Match | ${matchedSkills.length} skills matched | ${missingSkills.length} skills missing`;

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
detected_skills=$6,
missing_skills=$7,
resume_health=$8,
match_summary=$9,
uploaded_at=CURRENT_TIMESTAMP
WHERE user_id=$10
    `,
    [
      req.user.name,
      req.file.originalname,
      req.file.path,
      resumeText,
      score.overall,
      JSON.stringify(matchedSkills),
      JSON.stringify(missingSkills),
      resumeHealth,
      matchSummary,
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
      detected_skills,
      missing_skills,
      resume_health,
      match_summary
    )
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `,
    [
      userId,
      req.user.name,
      req.file.originalname,
      req.file.path,
      resumeText,
      score.overall,
      JSON.stringify(matchedSkills),
      JSON.stringify(missingSkills),
      resumeHealth,
      matchSummary,
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
        a.job_id,
        j.title,
        j.company,
        j.department,
        j.location,
        a.status,
        a.match_score,
        a.applied_at
      FROM applications a
      INNER JOIN job_postings j
        ON a.job_id = j.id
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
          resume.resume_text || ""
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
  SELECT
    id,
    title,
    company
  FROM job_postings
  WHERE
    id = $1
    AND LOWER(status)='open'
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
const getRecommendedJobs = async (req, res) => {
  try {

    const userId = req.user.id;

    // Get candidate's latest resume
    const resumeResult = await pool.query(
      `
      SELECT
        resume_id,
        detected_skills,
        match_score
      FROM resumes
      WHERE user_id=$1
      ORDER BY uploaded_at DESC
      LIMIT 1
      `,
      [userId]
    );

    if (resumeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Please upload your resume first.",
      });
    }

    const resume = resumeResult.rows[0];

    const detectedSkills = JSON.parse(
      resume.detected_skills || "[]"
    ).map(skill => skill.skill.toLowerCase());

    // Get active job postings
    const jobs = await pool.query(
      `
      SELECT *
      FROM job_postings
      WHERE LOWER(status)='open'
      ORDER BY posted_date DESC
      `
    );

    const recommendedJobs = jobs.rows.map(job => {

      const requiredSkills =
        job.required_skills || [];

      const matchedSkills = requiredSkills.filter(skill =>
        detectedSkills.includes(skill.toLowerCase())
      );

      const missingSkills = requiredSkills.filter(skill =>
        !detectedSkills.includes(skill.toLowerCase())
      );

      const matchScore =
        requiredSkills.length === 0
          ? 0
          : Math.round(
              (matchedSkills.length / requiredSkills.length) * 100
            );

      return {
        job_id: job.id,
        title: job.title,
        company: job.company,
        department: job.department,
        location: job.location,
        description: job.description,
        posted_date: job.posted_date,
        matchedSkills,
        missingSkills,
        matchScore,
      };

    });

    recommendedJobs.sort(
      (a, b) => b.matchScore - a.matchScore
    );

    return res.json({
      success: true,
      jobs: recommendedJobs,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const getProfile = async (req, res) => {
  try {

    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        user_id,
        name,
        email
      FROM users
      WHERE user_id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
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
  applyJob,
  getRecommendedJobs,
  getProfile,
};