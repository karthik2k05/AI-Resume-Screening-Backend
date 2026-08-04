const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  uploadResume,
  getMyApplications,
  getLatestResume,
  getRecommendedJobs,
  applyJob,
  getProfile,
} = require("../controllers/candidateController");

router.post(
  "/upload-resume",
  verifyToken,
  upload.single("resume"),
  uploadResume
);
router.get(
  "/applications",
  verifyToken,
  getMyApplications
);
router.get(
  "/resume",
  verifyToken,
  getLatestResume
);
router.get(
  "/jobs",
  verifyToken,
  getRecommendedJobs
);
router.post(
  "/apply",
  verifyToken,
  applyJob
);
router.get(
    "/profile",
    verifyToken,
    getProfile
);

module.exports = router;