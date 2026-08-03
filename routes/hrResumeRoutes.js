const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
    getAllResumes,
    deleteResume,
    deleteAllResumes,
    getAllApplications,
    shortlistApplication,
    rejectApplication,
    interviewApplication,
    getApplicationDetails,
    getDashboard,
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
router.get(
  "/applications",
  verifyToken,
  getAllApplications
);
router.put(
  "/applications/:applicationId/shortlist",
  verifyToken,
  shortlistApplication
);
router.put(
  "/applications/:applicationId/reject",
  verifyToken,
  rejectApplication
);
router.put(
  "/applications/:applicationId/interview",
  verifyToken,
  interviewApplication
);
router.get(
  "/applications/:applicationId",
  verifyToken,
  getApplicationDetails
);
router.get(
    "/dashboard",
    verifyToken,
    getDashboard
);
module.exports = router;