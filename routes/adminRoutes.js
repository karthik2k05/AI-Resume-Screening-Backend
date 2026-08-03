const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  getDashboardStats,
  getAdminOverview,
  getAllJobs,
  deleteJob,
  getCandidates,
  getAnalytics,
} = require("../controllers/adminController");

router.get(
  "/dashboard",
  verifyToken,
  getDashboardStats
);
router.get(
  "/overview",
  verifyToken,
  getAdminOverview
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
router.get(
    "/analytics",
    verifyToken,
    getAnalytics
);

module.exports = router;