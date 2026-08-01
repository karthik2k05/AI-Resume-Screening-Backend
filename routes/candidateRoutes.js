const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  uploadResume,
  getMyApplications,
  getLatestResume,
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

module.exports = router;