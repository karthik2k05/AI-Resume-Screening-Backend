const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  createJobPosting,
  getJobPostings,
  toggleJobPostingStatus,
  updateJobPosting,
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
router.put(
  "/:id",
  verifyToken,
  updateJobPosting
);

module.exports = router;