const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const db = require("./config/dbConfig"); // Assuming dbConfig provides your database connection
const initializeDatabase = require("./config/TableSchema"); // Assuming this sets up your tables
const authMiddleware = require("./middleware/authMiddleware"); // Your existing middleware
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Your frontend URL
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "5000mb" })); // Increased limit for larger file/voice data

// Public route
app.get("/", (req, res) => {
  res.send("Welcome to backend evangadi Forum!");
});

// Login simulation route to issue JWT token (for testing)
app.post("/login", (req, res) => {
  const { username, userid } = req.body;
  if (!username || !userid) {
    return res.status(400).json({ msg: "username and userid required" });
  }

  const token = jwt.sign({ username, userid }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  res.json({ token });
});

// Protected route using authMiddleware
app.get("/protected", authMiddleware, (req, res) => {
  res.json({
    msg: "You accessed a protected route!",
    user: req.user,
  });
});

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log(
    "App.js authenticateToken: Received Authorization Header:",
    authHeader
  );
  console.log(
    "App.js authenticateToken: Extracted Token:",
    token ? "Exists" : "Null/Undefined"
  );
  console.log("App.js authenticateToken: Using JWT_SECRET:", JWT_SECRET);

  if (!token) {
    console.error("App.js authenticateToken: No token provided. Sending 401.");
    return res
      .status(401)
      .json({ msg: "No token provided, authorization denied." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error(
        "App.js authenticateToken: Token verification failed:",
        err.message
      );
      if (err.name === "TokenExpiredError") {
        return res.status(403).json({ msg: "Token expired." });
      }
      return res.status(403).json({ msg: "Invalid token." });
    }
    req.user = user;
    console.log(
      "App.js authenticateToken: Token successfully verified. Decoded user:",
      req.user
    );
    next();
  });
};

const userRoutes = require("./routes/userRoutes");
app.use("/api/v1/user", userRoutes);

app.get("/api/check-user", authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT userid, username, email, avatar_url FROM users WHERE userid = ?",
      [req.user.userid]
    );

    if (users.length === 0) {
      console.error(
        `User with ID ${req.user.userid} not found in DB after token verification.`
      );
      return res.status(404).json({ msg: "User not found in database." });
    }

    const authenticatedUserData = users[0];

    res.status(200).json({
      message: "Token is valid",
      user: {
        userid: authenticatedUserData.userid,
        username: authenticatedUserData.username,
        email: authenticatedUserData.email,
        avatar_url: authenticatedUserData.avatar_url,
      },
    });
    console.log("/api/check-user: Sent back authenticated user data.");
  } catch (error) {
    console.error("Error fetching user data in /api/check-user:", error);
    res.status(500).json({ msg: "Internal server error while checking user." });
  }
});

const aiRoutes = require("./routes/aiRoutes");
app.use("/api/ai", aiRoutes);
const questionRoutes = require("./routes/questionRoute");
app.use("/api/v1", questionRoutes);
const answerRoutes = require("./routes/answerRoute");
app.use("/api/v1", answerRoutes);

const initializeSocket = require('./socket');
initializeSocket(io, db);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running and listening on port ${PORT}`);
});
