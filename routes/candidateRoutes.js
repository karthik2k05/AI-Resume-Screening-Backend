const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  uploadResume,
} = require("../controllers/candidateController");

router.post(
  "/upload-resume",
  verifyToken,
  upload.single("resume"),
  uploadResume
);

module.exports = router;