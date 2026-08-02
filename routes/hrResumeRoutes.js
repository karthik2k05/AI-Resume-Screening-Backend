const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
    getAllResumes,
    deleteResume,
} = require("../controllers/hrResumeController");

router.get(
    "/resumes",
    verifyToken,
    getAllResumes
);
router.delete(
    "/resumes/:resumeId",
    verifyToken,
    deleteResume
);

module.exports = router;