const express = require("express");
const router = express.Router();
const { chatWithAI } = require("../controller/aiController"); // Correctly destructures the function

// Route for AI chat
router.post("/chat", chatWithAI); // chatWithAI is now the function

module.exports = router;
