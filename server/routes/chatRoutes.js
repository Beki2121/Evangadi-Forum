const express = require("express");
const router = express.Router();
const { getMessageHistory } = require("../controller/chatController.js"); // Adjust path if controller is elsewhere
const authMiddleware = require("../middleware/authMiddleware"); // Adjust path to your authMiddleware

// Route to get private message history with another user
// GET /api/v1/chat/messages/:participantId
router.get("/messages/:participantId", authMiddleware, getMessageHistory);

module.exports = router;
