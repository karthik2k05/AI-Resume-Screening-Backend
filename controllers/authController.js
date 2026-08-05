const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getAuth } = require("firebase-admin/auth");
require("../firebase/firebaseAdmin");

// ================= REGISTER =================
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, Email, Password and Role are required",
      });
    }

    let table = "";

    switch (role.toLowerCase()) {
      case "admin":
        table = "admins";
        break;

      case "hr":
        table = "hrs";
        break;

      case "candidate":
        table = "users";
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid Role",
        });
    }

    // Check existing email
    const existing = await pool.query(
      `SELECT * FROM ${table} WHERE email=$1`,
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (table === "users") {
      await pool.query(
        `INSERT INTO users(name,email,password_hash)
         VALUES($1,$2,$3)`,
        [name, email, hashedPassword]
      );
    } else {
      await pool.query(
        `INSERT INTO ${table}(name,email,password_hash)
         VALUES($1,$2,$3)`,
        [name, email, hashedPassword]
      );
    }

    return res.status(201).json({
      success: true,
      message: "Registration Successful",
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ================= LOGIN =================
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, Password and Role are required",
      });
    }

    let table = "";
    let idColumn = "";

    switch (role.toLowerCase()) {
      case "admin":
        table = "admins";
        idColumn = "id";
        break;

      case "hr":
        table = "hrs";
        idColumn = "id";
        break;

      case "candidate":
        table = "users";
        idColumn = "user_id";
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid Role",
        });
    }

    // Find user
    const result = await pool.query(
      `SELECT * FROM ${table} WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email",
      });
    }

    const user = result.rows[0];

    // Compare password
    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      // Only candidates have login_history
      if (table === "users") {
        await pool.query(
          "INSERT INTO login_history(user_id,status) VALUES($1,$2)",
          [user.user_id, "FAILED"]
        );
      }

      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    // Save login history only for candidates
    if (table === "users") {
      await pool.query(
        "INSERT INTO login_history(user_id,status) VALUES($1,$2)",
        [user.user_id, "SUCCESS"]
      );
    }

    const token = jwt.sign(
      {
        id: user[idColumn],
        name: user.name,
        email: user.email,
        role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user[idColumn],
        name: user.name,
        email: user.email,
        role,
      },
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ================= GOOGLE LOGIN =================
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase ID Token is required",
      });
    }

    // Verify Firebase Token
    const decodedToken = await getAuth().verifyIdToken(idToken);

    const { email, name } = decodedToken;

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    let user;

    if (existingUser.rows.length === 0) {

      // Insert new Google user
      const newUser = await pool.query(
        `INSERT INTO users (name, email)
         VALUES ($1, $2)
         RETURNING *`,
        [name, email]
      );

      user = newUser.rows[0];

    } else {

      user = existingUser.rows[0];

    }

    // Save login history
    await pool.query(
      "INSERT INTO login_history (user_id, status) VALUES ($1, $2)",
      [user.user_id, "SUCCESS"]
    );

    // Generate your JWT
    const token = jwt.sign(
      {
        id: user.user_id,
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Google Login Successful",
      token,
      user: {
    id: user.user_id,
    name: user.name,
    email: user.email,
  },
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Google Login Failed",
    });

  }
};

module.exports = {
  register,
  login,
  googleLogin,
};