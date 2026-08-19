const pool = require("../config/db");

const getHROverview = async (req, res) => {
  try {
    const hrId = req.user.id;

    const [
      totalApplicants,
      activeJobPostings,
      totalJobPostings,
      totalApplications,
      monthlyApplications,
      applicationsPerJob,
      applicationStatus,
    ] = await Promise.all([

      // ================================
      // Total unique applicants
      // ================================
      pool.query(
        `
        SELECT COUNT(DISTINCT a.user_id) AS count
        FROM applications a
        INNER JOIN job_postings jp
          ON a.job_id = jp.id
        WHERE jp.hr_id = $1
        `,
        [hrId]
      ),

      // ================================
      // Active jobs
      // ================================
      pool.query(
        `
        SELECT COUNT(*) AS count
        FROM job_postings
        WHERE hr_id = $1
        AND LOWER(status) = 'open'
        `,
        [hrId]
      ),

      // ================================
      // Total jobs
      // ================================
      pool.query(
        `
        SELECT COUNT(*) AS count
        FROM job_postings
        WHERE hr_id = $1
        `,
        [hrId]
      ),

      // ================================
      // Total applications
      // ================================
      pool.query(
        `
        SELECT COUNT(*) AS count
        FROM applications a
        INNER JOIN job_postings jp
          ON a.job_id = jp.id
        WHERE jp.hr_id = $1
        `,
        [hrId]
      ),

      // ================================
      // Applications by month
      // ================================
      pool.query(
        `
        SELECT
          TO_CHAR(
            DATE_TRUNC('month', a.applied_at),
            'Mon'
          ) AS month,

          COUNT(*)::int AS applications

        FROM applications a

        INNER JOIN job_postings jp
          ON a.job_id = jp.id

        WHERE jp.hr_id = $1

        GROUP BY DATE_TRUNC('month', a.applied_at)

        ORDER BY DATE_TRUNC('month', a.applied_at)
        `,
        [hrId]
      ),

      // ================================
      // Applications per job
      // ================================
      pool.query(
        `
        SELECT
          jp.title,
          COUNT(a.application_id)::int AS applicants

        FROM job_postings jp

        LEFT JOIN applications a
          ON a.job_id = jp.id

        WHERE jp.hr_id = $1

        GROUP BY jp.id, jp.title

        ORDER BY applicants DESC
        `,
        [hrId]
      ),

      // ================================
      // Application status
      // ================================
      pool.query(
        `
        SELECT
          COALESCE(a.status, 'Applied') AS status,
          COUNT(*)::int AS count

        FROM applications a

        INNER JOIN job_postings jp
          ON a.job_id = jp.id

        WHERE jp.hr_id = $1

        GROUP BY a.status

        ORDER BY count DESC
        `,
        [hrId]
      ),
    ]);

    res.status(200).json({
      success: true,

      statistics: {
        totalApplicants: Number(
          totalApplicants.rows[0].count
        ),

        activeJobPostings: Number(
          activeJobPostings.rows[0].count
        ),

        totalJobPostings: Number(
          totalJobPostings.rows[0].count
        ),

        totalApplications: Number(
          totalApplications.rows[0].count
        ),

        interviewsThisWeek: 0,
        averageHireDays: 0,
      },

      // Graph data
      monthlyApplications: monthlyApplications.rows,

      applicationsPerJob: applicationsPerJob.rows,

      applicationStatus: applicationStatus.rows,
    });

  } catch (error) {
    console.error("HR Overview Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getHROverview,
};