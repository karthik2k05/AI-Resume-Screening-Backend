const pool = require("../config/db");

// Create notification for one user
const createNotification = async ({
  userId,
  userRole,
  title,
  message,
  type,
}) => {
  const result = await pool.query(
    `
    INSERT INTO notifications
      (user_id, user_role, title, message, type, is_read)
    VALUES
      ($1, $2, $3, $4, $5, false)
    RETURNING *
    `,
    [
      userId,
      userRole.toLowerCase(),
      title,
      message,
      type,
    ]
  );

  return result.rows[0];
};

// Create global notification for all candidates
const createGlobalCandidateNotification = async ({
  title,
  message,
  type = "global",
}) => {
  const result = await pool.query(
    `
    INSERT INTO notifications
      (user_id, user_role, title, message, type, is_read)
    SELECT
      user_id,
      'candidate',
      $1,
      $2,
      $3,
      false
    FROM users
    WHERE LOWER(role) = 'candidate'
    RETURNING *
    `,
    [title, message, type]
  );

  return result.rows;
};

// Create global notification for all admins
const createGlobalAdminNotification = async ({
  title,
  message,
  type = "global",
}) => {
  const result = await pool.query(
    `
    INSERT INTO notifications
      (user_id, user_role, title, message, type, is_read)
    SELECT
      id,
      'admin',
      $1,
      $2,
      $3,
      false
    FROM admins
    RETURNING *
    `,
    [title, message, type]
  );

  return result.rows;
};

// Create global notification for all HRs
const createGlobalHRNotification = async ({
  title,
  message,
  type = "global",
}) => {
  const result = await pool.query(
    `
    INSERT INTO notifications
      (user_id, user_role, title, message, type, is_read)
    SELECT
      id,
      'hr',
      $1,
      $2,
      $3,
      false
    FROM hrs
    RETURNING *
    `,
    [title, message, type]
  );

  return result.rows;
};

module.exports = {
  createNotification,
  createGlobalCandidateNotification,
  createGlobalAdminNotification,
  createGlobalHRNotification,
};