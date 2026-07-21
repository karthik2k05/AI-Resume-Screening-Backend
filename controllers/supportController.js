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
      message,
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO support_messages
      (candidate_id, sender, username, message)
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [candidateId, sender,  message]
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
  SELECT
    sm.message_id,
    sm.candidate_id,
    u.name AS username,
    sm.sender,
    sm.message,
    sm.created_at
  FROM support_messages sm
  JOIN users u
    ON sm.candidate_id = u.user_id
  WHERE sm.candidate_id = $1
  ORDER BY sm.created_at ASC
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
// ================= GET ALL CONVERSATIONS =================

const getConversations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.user_id AS "candidateId",
        u.name AS username,
        MAX(sm.created_at) AS "lastTime",
        (
          SELECT message
          FROM support_messages s2
          WHERE s2.candidate_id = u.user_id
          ORDER BY s2.created_at DESC
          LIMIT 1
        ) AS "lastMessage"
      FROM users u
      JOIN support_messages sm
        ON sm.candidate_id = u.user_id
      GROUP BY u.user_id, u.name
      ORDER BY "lastTime" DESC;
    `);

    res.status(200).json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to load conversations",
    });
  }
};


module.exports = {
  createSupportTicket,
  saveChatMessage,
  getChatHistory,
  getConversations,
};