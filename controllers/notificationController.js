const pool = require("../config/db");

// ================= GET NOTIFICATIONS =================

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role.toLowerCase();

    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        user_role,
        title,
        message,
        type,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = $1
      AND LOWER(user_role) = $2
      ORDER BY created_at DESC
      `,
      [userId, userRole]
    );

    return res.status(200).json({
      success: true,
      notifications: result.rows,
    });

  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
};


// ================= MARK ONE AS READ =================

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
      AND user_id = $2
      RETURNING *
      `,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      notification: result.rows[0],
    });

  } catch (error) {
    console.error("MARK NOTIFICATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notification.",
    });
  }
};


// ================= MARK ALL AS READ =================

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1
      AND is_read = false
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });

  } catch (error) {
    console.error("MARK ALL NOTIFICATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notifications.",
    });
  }
};


module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};