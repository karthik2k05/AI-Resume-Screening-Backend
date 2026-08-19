const pool = require("../config/db");
const {
  createNotification,
} = require("../services/notificationService");
// ADDED: Get the logged-in HR's ID
// Used to restrict HR data to their own job postings.
const getHRId = async (req) => {
  if (req.user?.role?.toLowerCase() === "hr" && req.user?.id) {
    return req.user.id;
  }

  if (req.user?.email) {
    const result = await pool.query(
      `SELECT id
       FROM hrs
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [req.user.email]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
  }

  return null;
};

const getAllResumes = async (req, res) => {
  try {

    // ADDED: Get logged-in HR
const hrId = await getHRId(req);

if (!hrId) {
  return res.status(403).json({
    success: false,
    message: "HR account not found.",
  });
}

// ADDED: Get only resumes of candidates who applied
// to jobs owned by this HR.
const result = await pool.query(
  `
  SELECT
    r.resume_id,
    r.user_id,
    r.hr_id,
    r.candidate_name,
    r.file_name,
    r.resume_text,
    r.detected_skills,
    r.missing_skills,
    r.match_score,
    r.resume_health,
    r.uploaded_at

  FROM resumes r

  WHERE r.hr_id = $1

  ORDER BY r.uploaded_at DESC
  `,
  [hrId]
);

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

// ================================
// Delete Resume
// HR can delete only resumes related
// to their own job postings
// ================================
const deleteResume = async (req, res) => {
  try {

    const { resumeId } = req.params;

    // ADDED: Get logged-in HR ID
    const hrId = await getHRId(req);

    if (!hrId) {
      return res.status(403).json({
        success: false,
        message: "HR account not found.",
      });
    }

    // ================================
    // Check whether this resume belongs
    // to an applicant of this HR's job
    // ================================
    const ownership = await pool.query(
      `
      SELECT r.resume_id

      FROM resumes r

      INNER JOIN applications a
        ON r.resume_id = a.resume_id

      INNER JOIN job_postings jp
        ON a.job_id = jp.id

      WHERE r.resume_id = $1
      AND jp.hr_id = $2

      LIMIT 1
      `,
      [resumeId, hrId]
    );

    if (ownership.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this resume.",
      });
    }

    // ================================
    // Delete ATS scores first
    // ================================
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

    // ================================
    // Delete applications
    // ================================
    await pool.query(
      `
      DELETE FROM applications
      WHERE resume_id = $1
      `,
      [resumeId]
    );

    // ================================
    // Delete resume
    // ================================
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

    console.error("DELETE RESUME ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ================================
// Delete All Resumes
// HR can delete only resumes/applications
// related to their own job postings
// ================================
const deleteAllResumes = async (req, res) => {
  try {

    // ADDED: Get logged-in HR ID
    const hrId = await getHRId(req);

    if (!hrId) {
      return res.status(403).json({
        success: false,
        message: "HR account not found.",
      });
    }

    // Get resume IDs belonging to this HR's applicants
    const resumes = await pool.query(
      `
      SELECT DISTINCT a.resume_id
      FROM applications a
      INNER JOIN job_postings jp
        ON a.job_id = jp.id
      WHERE jp.hr_id = $1
      AND a.resume_id IS NOT NULL
      `,
      [hrId]
    );

    const resumeIds = resumes.rows.map(row => row.resume_id);

    if (resumeIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No resumes found for this HR.",
      });
    }

    // Delete ATS scores
    await pool.query(
      `
      DELETE FROM ats_scores
      WHERE application_id IN (
        SELECT a.application_id
        FROM applications a
        INNER JOIN job_postings jp
          ON a.job_id = jp.id
        WHERE jp.hr_id = $1
      )
      `,
      [hrId]
    );

    // Delete applications
    await pool.query(
      `
      DELETE FROM applications
      WHERE application_id IN (
        SELECT a.application_id
        FROM applications a
        INNER JOIN job_postings jp
          ON a.job_id = jp.id
        WHERE jp.hr_id = $1
      )
      `,
      [hrId]
    );

    // Delete only the resumes collected above
    await pool.query(
      `
      DELETE FROM resumes
      WHERE resume_id = ANY($1::int[])
      `,
      [resumeIds]
    );

    return res.status(200).json({
      success: true,
      message: "All resumes for your job postings deleted successfully.",
    });

  } catch (error) {

    console.error("DELETE ALL HR RESUMES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
// ================================
// Get Applications for Logged-in HR
// ================================
const getAllApplications = async (req, res) => {
  try {

    // ADDED: Get logged-in HR ID
    const hrId = await getHRId(req);

    if (!hrId) {
      return res.status(403).json({
        success: false,
        message: "HR account not found.",
      });
    }

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

      -- ADDED: Only show applications for this HR's jobs
      WHERE jp.hr_id = $1

      ORDER BY a.applied_at DESC
      `,
      [hrId]
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
// ================================
// Update Application Status
// HR can update only their own applicants
// ================================
const updateApplicationStatus = async (
  req,
  res,
  status
) => {
  try {

    const { applicationId } = req.params;

    // ADDED: Get logged-in HR ID
    const hrId = await getHRId(req);

    if (!hrId) {
      return res.status(403).json({
        success: false,
        message: "HR account not found.",
      });
    }

    const result = await pool.query(
      `
      UPDATE applications a

      SET status = $1

      FROM job_postings jp

      WHERE a.application_id = $2

      AND a.job_id = jp.id

      -- ADDED: Only allow HR who owns the job
      AND jp.hr_id = $3

      RETURNING a.*
      `,
      [status, applicationId, hrId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Application not found or not assigned to your HR account.",
      });
    }

    //notify for application status changed
    const application = result.rows[0];

await createNotification({
  userId: application.user_id,
  userRole: "candidate",
  title: "Application Status Updated",
  message: `Your application status changed to: ${status}`,
  type: "status_update",
});

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

    // ADDED: Get logged-in HR ID
const hrId = await getHRId(req);

if (!hrId) {
  return res.status(403).json({
    success: false,
    message: "HR account not found.",
  });
}

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
AND jp.hr_id = $2
      `,
      [applicationId, hrId]
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

// ================================
// HR Dashboard
// Shows only data belonging to
// the logged-in HR's job postings
// ================================
const getDashboard = async (req, res) => {
  try {

    // ADDED: Get logged-in HR ID
    const hrId = await getHRId(req);

    if (!hrId) {
      return res.status(403).json({
        success: false,
        message: "HR account not found.",
      });
    }

    // ================================
    // Total Applicants
    // Only applications for this HR's jobs
    // ================================
    const totalApplicants = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM applications a
      INNER JOIN job_postings jp
        ON a.job_id = jp.id
      WHERE jp.hr_id = $1
      `,
      [hrId]
    );

    // ================================
    // Active Job Postings
    // Only this HR's jobs
    // ================================
    const activeJobPostings = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM job_postings
      WHERE hr_id = $1
      AND LOWER(status) = 'open'
      `,
      [hrId]
    );

    // ================================
    // Interviews This Week
    // Only applicants for this HR's jobs
    // ================================
    const interviewsThisWeek = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM applications a
      INNER JOIN job_postings jp
        ON a.job_id = jp.id
      WHERE jp.hr_id = $1
      AND a.status = 'Interview'
      AND a.applied_at >= NOW() - INTERVAL '7 days'
      `,
      [hrId]
    );

    // ================================
    // Average ATS Score
    // Only applications for this HR's jobs
    // ================================
    const averageATSScore = await pool.query(
      `
      SELECT
        ROUND(AVG(a.match_score), 2) AS average
      FROM applications a
      INNER JOIN job_postings jp
        ON a.job_id = jp.id
      WHERE jp.hr_id = $1
      `,
      [hrId]
    );

    // ================================
    // Applicant Trend
    // Only this HR's applicants
    // ================================
    const applicantTrend = await pool.query(
      `
      SELECT
        TO_CHAR(a.applied_at, 'Mon') AS month,
        COUNT(*)::int AS applicants

      FROM applications a

      INNER JOIN job_postings jp
        ON a.job_id = jp.id

      WHERE jp.hr_id = $1

      GROUP BY
        TO_CHAR(a.applied_at, 'Mon'),
        DATE_TRUNC('month', a.applied_at)

      ORDER BY
        DATE_TRUNC('month', a.applied_at)
      `,
      [hrId]
    );

    // ================================
    // Hiring Funnel
    // Only this HR's applicants
    // ================================
    const hiringFunnel = await pool.query(
      `
      SELECT
        a.status,
        COUNT(*)::int AS count

      FROM applications a

      INNER JOIN job_postings jp
        ON a.job_id = jp.id

      WHERE jp.hr_id = $1

      GROUP BY a.status
      `,
      [hrId]
    );

    return res.json({
      success: true,

      statistics: {

        totalApplicants:
          totalApplicants.rows[0].count,

        activeJobPostings:
          activeJobPostings.rows[0].count,

        interviewsThisWeek:
          interviewsThisWeek.rows[0].count,

        averageATSScore:
          Number(
            averageATSScore.rows[0].average || 0
          ),

      },

      applicantTrend:
        applicantTrend.rows,

      hiringFunnel:
        hiringFunnel.rows,

    });

  } catch (error) {

    console.error("HR DASHBOARD ERROR:", error);

    return res.status(500).json({

      success: false,

      message: "Internal Server Error",

    });

  }
};
// ================================
// HR Analytics
// Shows only analytics for the
// logged-in HR's job postings
// ================================
const getAnalytics = async (req, res) => {
  try {

    // ADDED: Get logged-in HR ID
    const hrId = await getHRId(req);

    if (!hrId) {
      return res.status(403).json({
        success: false,
        message: "HR account not found.",
      });
    }

    const [
      totalApplicants,
      activeJobs,
      interviews,
      averageATS,
      monthlyApplicants,
      hiringFunnel,
      departmentApplications,
      topJobs,
    ] = await Promise.all([

      // ================================
      // Total Applicants
      // ================================
      pool.query(
        `
        SELECT COUNT(*)::int AS count

        FROM applications a

        INNER JOIN job_postings jp
          ON a.job_id = jp.id

        WHERE jp.hr_id = $1
        `,
        [hrId]
      ),

      // ================================
      // Active Jobs
      // ================================
      pool.query(
        `
        SELECT COUNT(*)::int AS count

        FROM job_postings

        WHERE hr_id = $1
        AND LOWER(status) = 'open'
        `,
        [hrId]
      ),

      // ================================
      // Interviews
      // ================================
      pool.query(
        `
        SELECT COUNT(*)::int AS count

        FROM applications a

        INNER JOIN job_postings jp
          ON a.job_id = jp.id

        WHERE jp.hr_id = $1
        AND a.status = 'Interview'
        `,
        [hrId]
      ),

      // ================================
      // Average ATS
      // ================================
      pool.query(
        `
        SELECT
          ROUND(AVG(a.match_score), 2) AS average

        FROM applications a

        INNER JOIN job_postings jp
          ON a.job_id = jp.id

        WHERE jp.hr_id = $1
        `,
        [hrId]
      ),

      // ================================
      // Monthly Applicants
      // ================================
      pool.query(
        `
        SELECT
          TO_CHAR(a.applied_at, 'Mon') AS month,
          COUNT(*)::int AS applicants

        FROM applications a

        INNER JOIN job_postings jp
          ON a.job_id = jp.id

        WHERE jp.hr_id = $1

        GROUP BY
          DATE_TRUNC('month', a.applied_at),
          TO_CHAR(a.applied_at, 'Mon')

        ORDER BY
          DATE_TRUNC('month', a.applied_at)
        `,
        [hrId]
      ),

      // ================================
      // Hiring Funnel
      // ================================
      pool.query(
        `
        SELECT
          a.status,
          COUNT(*)::int AS count

        FROM applications a

        INNER JOIN job_postings jp
          ON a.job_id = jp.id

        WHERE jp.hr_id = $1

        GROUP BY a.status
        `,
        [hrId]
      ),

      // ================================
      // Applications by Department
      // ================================
      pool.query(
        `
        SELECT
          jp.department,
          COUNT(a.application_id)::int AS applicants

        FROM job_postings jp

        LEFT JOIN applications a
          ON jp.id = a.job_id

        WHERE jp.hr_id = $1

        GROUP BY jp.department

        ORDER BY applicants DESC
        `,
        [hrId]
      ),

      // ================================
      // Applications by Job
      // ================================
      pool.query(
        `
        SELECT
          jp.title,
          COUNT(a.application_id)::int AS applicants

        FROM job_postings jp

        LEFT JOIN applications a
          ON jp.id = a.job_id

        WHERE jp.hr_id = $1

        GROUP BY
          jp.id,
          jp.title

        ORDER BY applicants DESC
        `,
        [hrId]
      )

    ]);

    return res.json({

      success: true,

      statistics: {

        totalApplicants:
          totalApplicants.rows[0].count,

        activeJobs:
          activeJobs.rows[0].count,

        interviews:
          interviews.rows[0].count,

        averageATS:
          Number(
            averageATS.rows[0].average || 0
          )

      },

      monthlyApplicants:
        monthlyApplicants.rows,

      hiringFunnel:
        hiringFunnel.rows,

      departmentApplications:
        departmentApplications.rows,

      topJobs:
        topJobs.rows

    });

  } catch (error) {

    console.error("HR ANALYTICS ERROR:", error);

    return res.status(500).json({

      success: false,

      message: "Internal Server Error"

    });

  }
};

// Add a screened candidate to the applications pipeline
const createApplication = async (req, res) => {
  try {
    const { jobId, resumeId, matchScore } = req.body;

    if (!jobId || !resumeId) {
      return res.status(400).json({
        success: false,
        message: "Job ID and Resume ID are required.",
      });
    }

    const hrId = await getHRId(req);

    if (!hrId) {
      return res.status(403).json({
        success: false,
        message: "HR account not found.",
      });
    }

    // Make sure this job belongs to the logged-in HR
    const jobCheck = await pool.query(
      `
      SELECT id
      FROM job_postings
      WHERE id = $1
      AND hr_id = $2
      LIMIT 1
      `,
      [jobId, hrId]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to use this job posting.",
      });
    }

    // Make sure the resume exists
    const resumeCheck = await pool.query(
      `
      SELECT resume_id, user_id
      FROM resumes
      WHERE resume_id = $1
      AND hr_id = $2
      LIMIT 1
      `,
      [resumeId, hrId]
    );

    if (resumeCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    const userId = resumeCheck.rows[0].user_id;

    // Prevent duplicate application for same job + resume
    const existing = await pool.query(
  `
  SELECT application_id
  FROM applications
  WHERE job_id = $1
  AND user_id = $2
  LIMIT 1
  `,
  [jobId, userId]
);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Candidate is already in the pipeline for this job.",
        application_id: existing.rows[0].application_id,
      });
    }

    const result = await pool.query(
      `
      INSERT INTO applications
        (job_id, user_id, resume_id, status, applied_at, match_score)
      VALUES
        ($1, $2, $3, 'Screening', NOW(), $4)
      RETURNING *
      `,
      [
        jobId,
        userId,
        resumeId,
        Number(matchScore) || 0,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Candidate advanced to pipeline successfully.",
      application: result.rows[0],
    });

  } catch (error) {
    console.error("CREATE APPLICATION ERROR:", error);

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
     createApplication,
    getAllApplications,
    shortlistApplication,
    rejectApplication,
    interviewApplication,
    getApplicationDetails,
    getDashboard,
    getAnalytics,
};