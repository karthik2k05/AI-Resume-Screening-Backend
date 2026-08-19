const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../controllers/notificationController");

// Import the JWT authentication middleware used to protect notification routes.
const authenticateToken = require("../middleware/authMiddleware");

router.get(
  "/",
  authenticateToken,
  getNotifications
);

router.put(
  "/:id/read",
  authenticateToken,
  markNotificationAsRead
);

router.put(
  "/read-all",
  authenticateToken,
  markAllNotificationsAsRead
);

module.exports = router;