const { Server } = require("socket.io");
const db = require("./config/dbConfig");

// Helper function to generate a consistent private chat room ID
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

const ACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
let lastKnownActiveUsersCount = 0; // Tracks the count for broadcasting updates
const PUBLIC_CHAT_ROOM_ID = "stackoverflow_lobby";

// In-memory store for currently active users
const activeUsers = {};

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // ... (all socket event handlers from app.js)
// ... existing code ...
// (Insert all socket event handlers and logic from app.js here, replacing io and activeUsers references as needed)
// ... existing code ...
  });

  setInterval(() => {
    const fiveMinutesAgo = Date.now() - ACTIVITY_TIMEOUT_MS;
    let usersRemovedThisCycle = 0;
    for (const userid in activeUsers) {
      if (activeUsers[userid].lastActivity < fiveMinutesAgo) {
        delete activeUsers[userid];
        usersRemovedThisCycle++;
      }
    }
    const currentActiveUsersCount = Object.keys(activeUsers).length;
    if (
      usersRemovedThisCycle > 0 ||
      currentActiveUsersCount !== lastKnownActiveUsersCount
    ) {
      io.emit(
        "onlineUsers",
        Object.values(activeUsers).map((u) => ({
          userid: u.userid,
          username: u.username,
          avatar_url: u.avatar_url,
        }))
      );
      lastKnownActiveUsersCount = currentActiveUsersCount;
    }
  }, 30 * 1000);
}

module.exports = setupSocket;
