const pool = require("../config/db");

/* ================================
   Create Job Posting
================================ */

const createJobPosting = async (req, res) => {
  try {
    const {
      title,
      department,
      description,
      keySkills,
      company,
      location,
    } = req.body;

    // Validation
    if (!title || !department || !description) {
  return res.status(400).json({
    success: false,
    message: "Title, Department and Description are required.",
  });
}

    const result = await pool.query(
      `
      INSERT INTO job_postings
      (
        title,
        department,
        company,
        location,
        description,
        required_skills,
        status
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,'open'
      )
      RETURNING *;
      `,
      [
        title,
        department,
        company || "",
        location || "",
        description,
        keySkills || [],
      ]
    );

    res.status(201).json({
      success: true,
      message: "Job posted successfully.",
      job: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/* ================================
   Get All Job Postings
================================ */

const getJobPostings = async (req, res) => {
  try {

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    const offset = (page - 1) * limit;

    const totalResult = await pool.query(
      `
      SELECT COUNT(*)
      FROM job_postings
      WHERE
      LOWER(title) LIKE LOWER($1)
      OR LOWER(department) LIKE LOWER($1)
      `,
      [`%${search}%`]
    );

    const jobs = await pool.query(
      `
      SELECT *
      FROM job_postings
      WHERE
      LOWER(title) LIKE LOWER($1)
      OR LOWER(department) LIKE LOWER($1)

      ORDER BY posted_date DESC

      LIMIT $2
      OFFSET $3
      `,
      [`%${search}%`, limit, offset]
    );

    res.status(200).json({
      success: true,

      jobs: jobs.rows,

      pagination: {
        currentPage: page,
        totalPages: Math.ceil(
          Number(totalResult.rows[0].count) / limit
        ),
        totalRecords: Number(totalResult.rows[0].count),
        limit,
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

//Toggle buttons #status of jobs
const toggleJobPostingStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if job exists
    const existingJob = await pool.query(
      `SELECT id, status
       FROM job_postings
       WHERE id = $1`,
      [id]
    );

    if (existingJob.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job posting not found.",
      });
    }

    const currentStatus = existingJob.rows[0].status;

    const updatedStatus =
      currentStatus === "open" ? "closed" : "open";

    const result = await pool.query(
      `UPDATE job_postings
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [updatedStatus, id]
    );

    res.status(200).json({
      success: true,
      message: "Job status updated successfully.",
      job: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
//update JOB POSTING #Editing
const updateJobPosting = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      department,
      company,
      location,
      description,
      keySkills,
    } = req.body;

    // Validation
    if (!title || !department || !description) {
      return res.status(400).json({
        success: false,
        message: "Title, Department and Description are required.",
      });
    }

    // Check if job exists
    const existingJob = await pool.query(
      `SELECT id
       FROM job_postings
       WHERE id = $1`,
      [id]
    );

    if (existingJob.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job posting not found.",
      });
    }

    // Update
    const result = await pool.query(
      `UPDATE job_postings
       SET
         title = $1,
         department = $2,
         company = $3,
         location = $4,
         description = $5,
         required_skills = $6
       WHERE id = $7
       RETURNING *`,
      [
        title,
        department,
        company || "",
        location || "",
        description,
        Array.isArray(keySkills) ? keySkills : [],
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: "Job updated successfully.",
      job: result.rows[0],
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
//Delete job post
const deleteJobPosting = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if job exists
    const existingJob = await pool.query(
      `SELECT id FROM job_postings WHERE id = $1`,
      [id]
    );

    if (existingJob.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job posting not found.",
      });
    }

    // Check whether candidates have applied
    const applications = await pool.query(
      `SELECT application_id
       FROM applications
       WHERE job_id = $1`,
      [id]
    );

    if (applications.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete job. Candidates have already applied.",
      });
    }

    // Delete job
    await pool.query(
      `DELETE FROM job_postings
       WHERE id = $1`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Job deleted successfully.",
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
  createJobPosting,
  getJobPostings,
  toggleJobPostingStatus,
  updateJobPosting,
  deleteJobPosting,
};