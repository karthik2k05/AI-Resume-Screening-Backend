const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const upload = require("../middleware/uploadMiddleware");

const {
  uploadResumes,
} = require("../controllers/hrResumeUploadController");

router.post(
  "/upload-resumes",
  verifyToken,
  upload.array("resumes"),
  uploadResumes
);

module.exports = router;