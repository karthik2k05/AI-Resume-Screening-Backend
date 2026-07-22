const pool = require("../config/db");

const globalSearch = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query?.trim()) {
      return res.json({
        users: [],
        jobs: [],
        applications: [],
        tickets: [],
        messages: [],
      });
    }

    const search = `%${query}%`;

    const [
      users,
      jobs,
      applications,
      tickets,
      messages,
    ] = await Promise.all([

      pool.query(
        `
        SELECT user_id,name,email,role
        FROM users
        WHERE
        name ILIKE $1
        OR email ILIKE $1
        LIMIT 5
        `,
        [search]
      ),

      pool.query(
        `
        SELECT
          job_id,
          job_title,
          required_skills
        FROM jobs
        WHERE
        job_title ILIKE $1
        OR required_skills ILIKE $1
        OR description ILIKE $1
        LIMIT 5
        `,
        [search]
      ),

      pool.query(
        `
        SELECT
          application_id,
          status
        FROM applications
        WHERE
        status ILIKE $1
        LIMIT 5
        `,
        [search]
      ),

      pool.query(
        `
        SELECT
          ticket_id,
          issue_type,
          status
        FROM support_tickets
        WHERE
        issue_type ILIKE $1
        OR email ILIKE $1
        OR description ILIKE $1
        OR status ILIKE $1
        LIMIT 5
        `,
        [search]
      ),

      pool.query(
        `
        SELECT
          message_id,
          candidate_id,
          sender,
          message
        FROM support_messages
        WHERE
        message ILIKE $1
        LIMIT 5
        `,
        [search]
      ),

    ]);

    res.json({
      users: users.rows,
      jobs: jobs.rows,
      applications: applications.rows,
      tickets: tickets.rows,
      messages: messages.rows,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};

module.exports = {
  globalSearch,
};