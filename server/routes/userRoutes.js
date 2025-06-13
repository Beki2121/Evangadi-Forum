const express = require("express");
const router = express.Router();

const {
  register,
  login,
  check,
  getUserProfileById,
  updateUserProfile,
  getAllUsers,
  forgotPassword,
  resetPassword,
} = require("../controller/userController.js");

const authMiddleware = require("../middleware/authMiddleware.js");

// Register a new user
router.post("/register", register);

// Login user
router.post("/login", login);

// Forgot password route (send reset link)
router.post("/forgot-password", forgotPassword);

// Reset password route (uses token in URL)
router.post("/reset-password/:token", resetPassword);

// Check user authentication status (protected)
router.get("/check", authMiddleware, check);

// Get user profile by user ID (public or protected)
router.get("/:userid", getUserProfileById);

// Update user profile by user ID (protected)
router.put("/:userid", authMiddleware, updateUserProfile);

// Get all users (protected)
router.get("/", authMiddleware, getAllUsers);

module.exports = router;
