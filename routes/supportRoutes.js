const express = require("express");
const router = express.Router();

const {
  createSupportTicket,
  saveChatMessage,
  getChatHistory,
  getConversations,
  submitFeedback,
   getAllFeedbacks,
} = require("../controllers/supportController");

// Existing support ticket API
router.post("/ticket", createSupportTicket);

// Chat APIs
router.post("/messages", saveChatMessage);

router.get("/messages/:candidateId", getChatHistory);
router.get("/conversations", getConversations);
router.post("/feedback", submitFeedback);
router.get("/feedbacks", getAllFeedbacks);

module.exports = router;