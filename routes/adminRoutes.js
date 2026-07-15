const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  getDashboardStats,
  getAllJobs,
  deleteJob,
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
router.delete(
  "/jobs/:id",
  verifyToken,
  deleteJob
);

module.exports = router;