const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const nodemailer = require("nodemailer");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: 'Too many accounts created, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.log("Nodemailer error:", error);
  } else {
    console.log("Nodemailer ready");
  }
});

router.post('/register', registerLimiter, async (req, res) => {
  const { name, email, password, source } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }
  try {
    const existing = await pool.query(`SELECT id FROM candidates WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO candidates (name, email, password_hash, source) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, source`,
      [name, email, passwordHash, source || 'Direct']
    );
    
    const newUser = result.rows[0];
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ message: 'Registered successfully', token, user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    let result = await pool.query(`SELECT * FROM candidates WHERE email = $1`, [email]);
    let userType = result.rows[0]?.role || 'candidate';

    if (result.rows.length === 0) {
      result = await pool.query(`SELECT * FROM admins WHERE email = $1`, [email]);
      userType = 'admin';
    }

    if (result.rows.length === 0) {
      result = await pool.query(`SELECT * FROM hrs WHERE email = $1`, [email]);
      userType = 'hr';
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ message: 'This account has no password set' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: userType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userType,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// POST /api/auth/forgot-password
// Step 1: User enters email, backend generates and returns a 6-digit OTP
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    let table = null;
    let existing = await pool.query(`SELECT id FROM candidates WHERE email = $1`, [email]);
    if (existing.rows.length > 0) {
      table = 'candidates';
    } else {
      existing = await pool.query(`SELECT id FROM admins WHERE email = $1`, [email]);
      if (existing.rows.length > 0) {
        table = 'admins';
      } else {
        existing = await pool.query(`SELECT id FROM hrs WHERE email = $1`, [email]);
        if (existing.rows.length > 0) {
          table = 'hrs';
        }
      }
    }

    if (!table) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    await pool.query(
      `UPDATE ${table} SET reset_otp = $1, reset_otp_expiry = $2 WHERE email = $3`,
      [otp, expiry, email]
    );

    await transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: email,
  subject: "ResumeIQ Password Reset OTP",
  text: `Your password reset OTP is ${otp}. It expires in 15 minutes.`
});

res.json({
  message: "OTP sent successfully to email"
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/verify-otp
// Step 2: User enters the OTP, backend checks it's correct and not expired
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    let table = null;
    let user = await pool.query(`SELECT * FROM candidates WHERE email = $1`, [email]);
    if (user.rows.length > 0) {
      table = 'candidates';
    } else {
      user = await pool.query(`SELECT * FROM admins WHERE email = $1`, [email]);
      if (user.rows.length > 0) {
        table = 'admins';
      } else {
        user = await pool.query(`SELECT * FROM hrs WHERE email = $1`, [email]);
        if (user.rows.length > 0) {
          table = 'hrs';
        }
      }
    }

    if (!table) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const account = user.rows[0];

    if (!account.reset_otp || account.reset_otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > new Date(account.reset_otp_expiry)) {
      return res.status(400).json({ message: 'OTP has expired, please request a new one' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/reset-password
// Step 3: User submits new password (after OTP was verified)
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, OTP, and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    let table = null;
    let user = await pool.query(`SELECT * FROM candidates WHERE email = $1`, [email]);
    if (user.rows.length > 0) {
      table = 'candidates';
    } else {
      user = await pool.query(`SELECT * FROM admins WHERE email = $1`, [email]);
      if (user.rows.length > 0) {
        table = 'admins';
      } else {
        user = await pool.query(`SELECT * FROM hrs WHERE email = $1`, [email]);
        if (user.rows.length > 0) {
          table = 'hrs';
        }
      }
    }

    if (!table) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const account = user.rows[0];

    if (!account.reset_otp || account.reset_otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > new Date(account.reset_otp_expiry)) {
      return res.status(400).json({ message: 'OTP has expired, please request a new one' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE ${table} SET password_hash = $1, reset_otp = NULL, reset_otp_expiry = NULL WHERE email = $2`,
      [passwordHash, email]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;