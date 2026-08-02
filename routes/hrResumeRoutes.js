const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
    getAllResumes,
    deleteResume,
    deleteAllResumes,
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
router.delete(
    "/resumes",
    verifyToken,
    deleteAllResumes
);

module.exports = router;