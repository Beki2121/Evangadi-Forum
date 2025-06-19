const express = require("express");
const router = express.Router();

const {
  postQuestion,
  getAllQuestions,
  getQuestionAndAnswer,
  markAnswerAsSolution, // Import the new function
  deleteQuestion,
  confirmDeleteQuestion,
  editQuestion,
} = require("../controller/questionController");
const authMiddleware = require("../middleware/authMiddleware"); // Import it here

// get all questions
router.get("/questions", authMiddleware, getAllQuestions);

// get single question and its answers
router.get("/question/:questionId", getQuestionAndAnswer);

// post a question
router.post("/question", authMiddleware, postQuestion);

// NEW ROUTE: Mark an answer as a solution
router.patch(
  "/question/:questionId/mark-solution",
  authMiddleware,
  markAnswerAsSolution
);

// Delete a question (ask for confirmation)
router.delete('/question/:questionId', authMiddleware, deleteQuestion);
// Confirmed delete (actual removal)
router.post('/question/:questionId/confirm-delete', authMiddleware, confirmDeleteQuestion);
// Edit a question
router.put('/question/:questionId', authMiddleware, editQuestion);

module.exports = router;
