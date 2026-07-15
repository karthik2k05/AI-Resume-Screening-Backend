const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");


const {
  getApplicantsByJob,
  shortlistCandidate,
  rejectCandidate,
    getTopCandidates,
    filterCandidates,
} = require("../controllers/hrController");

router.get(
  "/jobs/:jobId/applicants",
  verifyToken,
  getApplicantsByJob
);
router.put(
    "/applications/:id/shortlist",
    verifyToken,
    shortlistCandidate
);
router.put(
  "/applications/:id/reject",
  verifyToken,
  rejectCandidate
);
router.get(
  "/top-candidates",
  verifyToken,
  getTopCandidates
);
router.get(
  "/filter",
  verifyToken,
  filterCandidates
);


module.exports = router;