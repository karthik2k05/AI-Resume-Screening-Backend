const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
  upgradeSubscription,
  getCurrentSubscription,
} = require("../controllers/subscriptionController");
router.get(
  "/current",
  verifyToken,
  getCurrentSubscription
);
router.post(
  "/upgrade",
  verifyToken,
  upgradeSubscription
);

module.exports = router;