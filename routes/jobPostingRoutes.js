const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  createJobPosting,
  getJobPostings,
  toggleJobPostingStatus,
} = require("../controllers/jobPostingController");

router.post(
  "/",
  verifyToken,
  createJobPosting
);

router.get(
  "/",
  verifyToken,
  getJobPostings
);
router.patch(
  "/:id/status",
  verifyToken,
  toggleJobPostingStatus
);

module.exports = router;