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
    if (
      !title ||
      !department ||
      !description ||
      !keySkills ||
      keySkills.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, Department, Description and Required Skills are required.",
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
        keySkills,
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

module.exports = {
  createJobPosting,
  getJobPostings,
};