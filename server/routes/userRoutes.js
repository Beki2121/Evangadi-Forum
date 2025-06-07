const express = require("express");
const router = express.Router(); // using router insted of app on the servers
const { register, login, check } = require("../controller/usercontroller.js");
// authentication middleware
const authMiddleware = require("../middleware/authMiddleware.js");

// register route
router.post("/register", register);

// login users
router.post("/login", login);

//check users
router.get("/check", authMiddleware, check);

module.exports = router;
