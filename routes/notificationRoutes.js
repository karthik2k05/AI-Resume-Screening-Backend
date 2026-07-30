const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const {
  authenticateToken,
  requireAdmin
} = require('../middleware/authMiddleware');

//Get notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM notifications
       WHERE user_id = $1
       AND user_role = $2
       ORDER BY created_at DESC`,
      [req.user.id, req.user.role]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Server error'
    });
  }
});
//read notifications
router.patch('/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1
       AND user_id = $2
       AND user_role = $3
       RETURNING *`,
      [
        id,
        req.user.id,
        req.user.role
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Notification not found'
      });
    }

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Server error'
    });
  }
});
// POST /api/notifications/global
// Admin sends a notification to candidates, HR, or everyone
router.post(
  '/global',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const {
      title,
      message,
      target_role
    } = req.body;

    // Validate input
    if (!title || !message || !target_role) {
      return res.status(400).json({
        message: 'title, message and target_role are required'
      });
    }

    // Allowed target groups
    if (!['candidate', 'hr', 'all'].includes(target_role)) {
      return res.status(400).json({
        message: 'target_role must be candidate, hr, or all'
      });
    }

    try {

      // Send to all candidates
      if (
        target_role === 'candidate' ||
        target_role === 'all'
      ) {
        await pool.query(
          `INSERT INTO notifications
           (
             user_id,
             user_role,
             title,
             message,
             type
           )
           SELECT
             id,
             'candidate',
             $1,
             $2,
             'global'
           FROM candidates`,
          [
            title,
            message
          ]
        );
      }


      // Send to all HR users
      if (
        target_role === 'hr' ||
        target_role === 'all'
      ) {
        await pool.query(
          `INSERT INTO notifications
           (
             user_id,
             user_role,
             title,
             message,
             type
           )
           SELECT
             id,
             'hr',
             $1,
             $2,
             'global'
           FROM hr`,
          [
            title,
            message
          ]
        );
      }


      res.status(201).json({
        message: 'Global notification sent successfully'
      });

    } catch (err) {

      console.error(
        'Global notification error:',
        err
      );

      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);

module.exports = router;