const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  createJobPosting,
  getJobPostings,
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

module.exports = router;