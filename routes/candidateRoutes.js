const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  uploadResume,
  getMyApplications,
  getLatestResume,
  getJobs,
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
  getJobs
);

module.exports = router;