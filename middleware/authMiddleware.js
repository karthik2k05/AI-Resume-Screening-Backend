const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access Denied. No Token Provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or Expired Token",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "Admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

const requireCandidate = (req, res, next) => {
  if (req.user.role !== "candidate" && req.user.role !== "Candidate") {
    return res.status(403).json({ message: "Candidate access required" });
  }
  next();
};

const requireHR = (req, res, next) => {
  if (req.user.role !== "hr") {
    return res.status(403).json({ message: "HR access required" });
  }
  next();
};

// Support both import styles:
// old code: const verifyToken = require('../middleware/authMiddleware')
// new code: const { authenticateToken, requireAdmin, requireHR } = require('../middleware/authMiddleware')
module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.requireAdmin = requireAdmin;
module.exports.requireCandidate = requireCandidate;
module.exports.requireHR = requireHR;