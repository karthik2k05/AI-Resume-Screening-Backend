const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  uploadResume,
} = require("../controllers/resumeController");

// Upload Resume
router.post(
  "/upload",
  verifyToken,
  upload.single("resume"),
  uploadResume
);

module.exports = router;