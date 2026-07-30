const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const {
  authenticateToken,
  requireHR
} = require('../middleware/authMiddleware');

// GET /api/hr/settings/:id
// Fetch current profile + notification preferences
router.get('/settings/:id', authenticateToken, requireHR, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, name, email, role, email_notifications, product_updates, weekly_digest
       FROM hrs
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'HR not found'
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Server error'
    });
  }
});


// PATCH /api/hr/settings/:id/profile
// Update name and/or email
router.patch('/settings/:id/profile', authenticateToken, requireHR, async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  try {
    const result = await pool.query(
      `UPDATE hrs
       SET name = COALESCE($1, name),
           email = COALESCE($2, email)
       WHERE id = $3
       RETURNING id, name, email, role`,
      [name, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'HR not found'
      });
    }

    res.json({
      message: 'Profile updated',
      hr: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Server error'
    });
  }
});


// PATCH /api/hr/settings/:id/password
// Change password
router.patch('/settings/:id/password', authenticateToken, requireHR, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters'
    });
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
      `UPDATE hrs
       SET password_hash = $1
       WHERE id = $2
       RETURNING id, name, email`,
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'HR not found'
      });
    }

    res.json({
      message: 'Password updated successfully'
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Server error'
    });
  }
});


// PATCH /api/hr/settings/:id/notifications
// Toggle notification preferences
router.patch('/settings/:id/notifications', authenticateToken, requireHR, async (req, res) => {
  const { id } = req.params;
  const {
    email_notifications,
    product_updates,
    weekly_digest
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE hrs
       SET email_notifications = COALESCE($1, email_notifications),
           product_updates = COALESCE($2, product_updates),
           weekly_digest = COALESCE($3, weekly_digest)
       WHERE id = $4
       RETURNING id, email_notifications, product_updates, weekly_digest`,
      [
        email_notifications,
        product_updates,
        weekly_digest,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'HR not found'
      });
    }

    res.json({
      message: 'Notification preferences updated',
      settings: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Server error'
    });
  }
});

module.exports = router;