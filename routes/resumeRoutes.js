const express = require("express");
const multer = require("multer");

const router = express.Router();

const resumeController = require("../controllers/resumeController");

// Store uploaded file temporarily in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// Upload Resume
router.post(
  "/upload",
  upload.single("resume"),
  resumeController.uploadResume
);

module.exports = router;