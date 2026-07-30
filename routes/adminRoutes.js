const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  getDashboardStats,
  getAllJobs,
  deleteJob,
  getCandidates,
} = require("../controllers/adminController");

router.get(
  "/dashboard",
  verifyToken,
  getDashboardStats
);
router.get(
  "/jobs",
  verifyToken,
  getAllJobs
);
router.get(
  "/candidates",
  verifyToken,
  getCandidates
);
router.delete(
  "/jobs/:id",
  verifyToken,
  deleteJob
);

module.exports = router;