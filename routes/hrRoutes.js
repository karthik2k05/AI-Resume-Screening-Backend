const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  getHROverview,
} = require("../controllers/hrController");

router.get(
  "/overview",
  verifyToken,
  getHROverview
);

module.exports = router;