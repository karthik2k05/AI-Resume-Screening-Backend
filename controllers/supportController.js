const pool = require("../config/db");

// ================= CREATE SUPPORT TICKET =================

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


// ================= SAVE CHAT MESSAGE =================

const saveChatMessage = async (req, res) => {
  try {
    const {
      candidateId,
      sender,
      username,
      message,
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO support_messages
      (candidate_id, sender, username, message)
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [candidateId, sender, username, message]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to save message",
    });
  }
};


// ================= GET CHAT HISTORY =================

const getChatHistory = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM support_messages
      WHERE candidate_id = $1
      ORDER BY created_at ASC
      `,
      [candidateId]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};


module.exports = {
  createSupportTicket,
  saveChatMessage,
  getChatHistory,
};