const express = require("express");
const router = express.Router();

const {
  createSupportTicket,
  saveChatMessage,
  getChatHistory,
} = require("../controllers/supportController");

// Existing support ticket API
router.post("/ticket", createSupportTicket);

// Chat APIs
router.post("/messages", saveChatMessage);

router.get("/messages/:candidateId", getChatHistory);

module.exports = router;