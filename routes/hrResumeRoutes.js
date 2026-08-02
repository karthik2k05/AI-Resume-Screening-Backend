const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
    getAllResumes,
} = require("../controllers/hrResumeController");

router.get(
    "/resumes",
    verifyToken,
    getAllResumes
);

module.exports = router;