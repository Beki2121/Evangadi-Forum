const express = require("express");
const http = require("http");
const cors = require("cors");
const db = require("./config/dbConfig"); // Assuming dbConfig provides your database connection
const initializeDatabase = require("./config/TableSchema"); // Assuming this sets up your tables
const authMiddleware = require("./middleware/authMiddleware"); // Your existing middleware
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Import the socket setup function
const setupSocket = require("./socket");

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "50mb" })); // Increased limit for larger file/voice data

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

// Endpoint to fetch chat history for a room (optional, primarily for initial load)
app.get("/api/chat/history/:roomId", authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  const { type, targetuserid } = req.query; // Add query params for message type and target user
  const userid = req.user.userid; // Current authenticated user

  try {
    let query;
    let params;

    if (type === "private" && targetuserid) {
      const dmRoomId = getPrivateChatRoomId(userid, targetuserid);
      query = `
        SELECT message_id, userid, username, avatar_url, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type, audio_data, audio_type, audio_duration
        FROM chat_messages
        WHERE room_id = ? AND message_type = 'private'
        ORDER BY created_at ASC LIMIT 200;
      `;
      params = [dmRoomId];
    } else {
      // Default to public if type is not private or targetuserid is missing
      query = `
        SELECT message_id, userid, username, avatar_url, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type, audio_data, audio_type, audio_duration
        FROM chat_messages
        WHERE room_id = ? AND message_type = 'public'
        ORDER BY created_at ASC LIMIT 200;`;
      params = [roomId];
    }

    const [messages] = await db.query(query, params);
    const formattedMessages = messages.map((msg) => {
      return {
        ...msg,
        reactions: parseReactionsSafely(msg.reactions, msg.message_id),
        file_data: msg.file_data || null,
        file_name: msg.file_name || null,
        file_type: msg.file_type || null,
        audio_data: msg.audio_data || null,
        audio_type: msg.audio_type || null,
        audio_duration: msg.audio_duration || null,
      };
    });
    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error("Error fetching chat history via HTTP:", error);
    res.status(500).json({ message: "Server error fetching chat history" });
  }
});

// Helper function to generate a consistent private chat room ID
// Ensures that DM between User A and User B always has the same room ID (e.g., "1-2" not "2-1")
function getPrivateChatRoomId(user1Id, user2Id) {
  const sortedIds = [user1Id, user2Id].sort();
  return `${sortedIds[0]}-${sortedIds[1]}`;
}

// Helper function for robust JSON parsing of reactions
function parseReactionsSafely(reactionsString, messageId = "unknown") {
  if (
    typeof reactionsString === "string" &&
    reactionsString.trim().length > 0 &&
    reactionsString !== "[object Object]"
  ) {
    try {
      return JSON.parse(reactionsString);
    } catch (e) {
      console.error(
        `Error parsing reactions for message ID ${messageId}: ${e.message}. Raw reactions: '${reactionsString}'`
      );
      // Fallback to empty array if parsing fails
      return [];
    }
  } else if (reactionsString === "[object Object]") {
    // Handle the case where "[object Object]" string was stored
    console.warn(
      `Malformed reaction data "[object Object]" found for message ID ${messageId}. Initializing reactions to empty.`
    );
    return [];
  }
  return []; // Default for null, undefined, empty string, or non-string types
}

// ==============================================
// In-memory store for currently active users (based on connection AND activity)
const activeUsers = {}; // { userid: { userid, username, avatar_url, sid, lastActivity, currentRoomId } }
const ACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
let lastKnownActiveUsersCount = 0; // Tracks the count for broadcasting updates

// Define the public chat room ID
const PUBLIC_CHAT_ROOM_ID = "stackoverflow_lobby";
// ==============================================

// Main function to start the server after database initialization
async function startServer() {
  try {
    // 1. Initialize the database first
    await initializeDatabase();
    console.log("Database initialized successfully on app startup.");

    // 2. Setup socket.io using the extracted function
    setupSocket(server);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running and listening on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "Failed to start server due to database initialization error:",
      error
    );
    process.exit(1); // Exit the process if critical database initialization fails
  }
}

// Call the main function to start the server
startServer();