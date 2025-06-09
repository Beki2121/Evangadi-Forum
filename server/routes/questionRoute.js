const express = require("express");
const router = express.Router();

const {
  postQuestion,
  getAllQuestions,
  getQuestionAndAnswer,
} = require("../controller/questionController");
const authMiddleware = require("../middleware/authMiddleware"); // Import it here
// get all questions
router.get("/questions", getAllQuestions);

// get single question
router.get("/question/:questionId", getQuestionAndAnswer);

// post a question
router.post("/question", authMiddleware, postQuestion);

module.exports = router;
