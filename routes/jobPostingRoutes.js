const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  createJobPosting,
  getJobPostings,
  toggleJobPostingStatus,
  updateJobPosting,
  deleteJobPosting,
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
router.delete(
  "/:id",
  verifyToken,
  deleteJobPosting
);

module.exports = router;