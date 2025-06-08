const express = require("express");
const router = express.Router();
const { chatWithAI } = require("../controller/aiController"); // We'll create this

// Route for AI chat
router.post("/chat", chatWithAI);

module.exports = router;
