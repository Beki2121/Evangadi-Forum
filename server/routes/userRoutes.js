const express = require("express");
const router = express.Router();
const {
  register,
  login,
  check,
  getUserProfileById,
  updateUserProfile,
  getAllUsers, // Ensure getAllUsers is imported here
} = require("../controller/userController.js"); // Make sure this path is correct relative to userRoutes.js
const authMiddleware = require("../middleware/authMiddleware.js"); // Make sure this path is correct

// Route for user registration
router.post("/register", register);

// Route for user login
router.post("/login", login);

// Route to check user authentication status (requires authMiddleware)
router.get("/check", authMiddleware, check);

// Route to get a user's profile by their ID (public access, can be protected)
router.get("/:userid", getUserProfileById);

// Route to update a user's profile by their ID (requires authentication)
router.put("/:userid", authMiddleware, updateUserProfile);

// --- IMPORTANT FIX START ---
// NEW ROUTE: Get all registered users (requires authentication to access)
// This route is at the root of the path where userRoutes is mounted.
// If app.js uses app.use("/api/v1/user", userRoutes), then this route becomes /api/v1/user/
router.get("/", authMiddleware, getAllUsers);
// --- IMPORTANT FIX END ---

module.exports = router;
