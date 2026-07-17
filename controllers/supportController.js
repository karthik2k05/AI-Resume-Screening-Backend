const pool = require("../config/db");

const createSupportTicket = async (req, res) => {
  try {
    const { issue_type, email, description } = req.body;

    if (!issue_type || !email || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO support_tickets
      (issue_type,email,description)
      VALUES ($1,$2,$3)
      RETURNING *`,
      [issue_type, email, description]
    );

    res.status(201).json({
      success: true,
      message: "Support ticket submitted successfully.",
      ticket: result.rows[0],
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
  createSupportTicket,
};