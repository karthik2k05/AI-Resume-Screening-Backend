const express = require("express");
const { extractJDKeywords } = require("../lib/jdMatcher");

const router = express.Router();

// POST /api/jd/keywords  { jobDescription } -> { requiredSkills, extraKeywords }
router.post("/keywords", (req, res) => {
  const { jobDescription } = req.body || {};
  const result = extractJDKeywords(jobDescription || "");
  res.json(result);
});

module.exports = router;
