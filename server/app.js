// app.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const db = require("./config/dbConfig");
const initializeDatabase = require("./config/TableSchema");
const bcrypt = require("bcryptjs");
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

app.use(cors({ origin: "http://localhost:5173" })); // Your frontend URL
app.use(express.json());

// Initialize database tables on server start
initializeDatabase();

// ==============================================
// In-memory store for currently active users (based on connection AND activity)
// This will replace the simple 'onlineUsers' for presence tracking.
const activeUsers = {}; // { userId: { userId, username, avatar_url, sid, lastActivity, currentRoomId } }
const ACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
let lastKnownActiveUsersCount = 0; // To prevent unnecessary broadcasts

// Define the public chat room ID
const PUBLIC_CHAT_ROOM_ID = "stackoverflow_lobby";
// ==============================================

// JWT Secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.sendStatus(401); // No token provided
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Token is invalid or expired
    }
    req.user = user; // Attach user payload to request
    next();
  });
};

// ==============================================
// Authentication Routes - Handled by userRoutes
// ==============================================

// User authentication routes
const userRoutes = require("./routes/userRoutes");
// IMPORTANT: This mounts userRoutes at /api/v1/user.
// So, if userRoutes.js has router.post('/login', ...), the full path will be /api/v1/user/login
app.use("/api/v1/user", userRoutes);

// Check User (Protected Route Example)
app.get("/api/check-user", authenticateToken, (req, res) => {
  res.status(200).json({
    message: "Token is valid",
    user: {
      userid: req.user.userid,
      username: req.user.username,
      email: req.user.email,
    },
  });
});

// ==============================================
// Other API Endpoints
// ==============================================

// AI-related routes
const aiRoutes = require("./routes/aiRoutes");
app.use("/api/ai", aiRoutes);
// Questions-related routes
const questionRoutes = require("./routes/questionRoute");
app.use("/api/v1", questionRoutes);
// Answers-related routes
const answerRoutes = require("./routes/answerRoute");
app.use("/api/v1", answerRoutes);

// Endpoint to fetch chat history for a room (optional, primarily for initial load)
app.get("/api/chat/history/:roomId", authenticateToken, async (req, res) => {
  const { roomId } = req.params;
  try {
    const [messages] = await db.query(
      `SELECT message_id, user_id, username, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type
             FROM chat_messages
             WHERE room_id = ? AND message_type = 'public' -- Fetch public messages for this room
             ORDER BY created_at ASC`,
      [roomId]
    );
    const formattedMessages = messages.map((msg) => ({
      ...msg,
      reactions: msg.reactions || [],
      file_data: msg.file_data || null,
      file_name: msg.file_name || null,
      file_type: msg.file_type || null,
    }));
    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Server error fetching chat history" });
  }
});

// ==============================================
// Socket.IO event handling
// ==============================================

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Emitted by frontend when a user joins the chat
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room: ${roomId}`);
    // Update user's current room tracking in activeUsers
    for (const userId in activeUsers) {
      if (activeUsers[userId].sid === socket.id) {
        activeUsers[userId].currentRoomId = roomId;
        console.log(
          `User ${activeUsers[userId].username} (ID: ${userId}) updated to room ${roomId}`
        );
        break;
      }
    }
    // Broadcast updated online users as their room status might change, though not explicitly displayed in public chat
    io.emit(
      "online_users",
      Object.values(activeUsers).map((u) => ({
        userId: u.userId,
        username: u.username,
        avatar_url: u.avatar_url,
      }))
    );
  });

  // Emitted by frontend to fetch chat history (both public and private)
  socket.on("fetch_chat_history", async (data) => {
    const { roomId, userId } = data; // userId is needed for private chats
    try {
      let query = `
                SELECT message_id, user_id, username, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type
                FROM chat_messages
                WHERE (room_id = ? AND message_type = 'public')`;
      let params = [roomId];

      if (userId) {
        // If fetching for a specific user (for DMs)
        // Assuming userId is the current logged-in user
        query += ` OR (message_type = 'private' AND (
                                (user_id = ? AND recipient_id = ?) OR
                                (user_id = ? AND recipient_id = ?)
                            ))`;
        // Add parameters for the private chat condition
        // This means fetching messages where:
        // (current_user_id sent to other_user_id) OR (other_user_id sent to current_user_id)
        // For simplicity, I'm assuming 'roomId' for public chat or 'userId' for a specific user's DMs
        // You would need to pass the *other* user's ID for specific DM history.
        // For now, this fetches all private messages involving the requesting user.
        // A better approach for DMs would be to pass `currentUserId` and `targetUserId`.
        // Let's refine this to specifically fetch messages for a given DM pair:
        query = `
                    SELECT message_id, user_id, username, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type
                    FROM chat_messages
                    WHERE (room_id = ? AND message_type = 'public')`;
        params = [roomId];
        if (data.targetUserId) {
          // If a specific DM target is provided
          query += ` OR (message_type = 'private' AND (
                                        (user_id = ? AND recipient_id = ?) OR
                                        (user_id = ? AND recipient_id = ?)
                                    ))`;
          params.push(userId, data.targetUserId, data.targetUserId, userId);
        } else {
          // Fetch only public messages if no target user for DM
          // No change needed as the initial query already handles public
        }
      }
      query += ` ORDER BY created_at ASC LIMIT 200;`; // Limit history fetched

      const [messages] = await db.query(query, params);

      const formattedMessages = messages.map((msg) => ({
        ...msg,
        reactions: msg.reactions || [],
        file_data: msg.file_data || null,
        file_name: msg.file_name || null,
        file_type: msg.file_type || null,
      }));
      socket.emit("chat_history", formattedMessages);
    } catch (error) {
      console.error("Error fetching chat history via socket:", error);
    }
  });

  // ==========================================================
  // Active User Tracking Logic
  // ==========================================================

  // Registers a user as online and updates their activity timestamp
  socket.on("user_online", (data) => {
    const userId = data.userId;
    if (userId) {
      activeUsers[userId] = {
        userId: userId,
        username: data.username || "Anonymous",
        avatar_url: data.avatar_url,
        sid: socket.id, // Store session ID to associate with disconnects
        lastActivity: Date.now(), // Set initial activity timestamp
        currentRoomId: PUBLIC_CHAT_ROOM_ID, // Assume public lobby on initial connect
      };
      console.log(
        `User ${activeUsers[userId].username} (ID: ${userId}) marked online/active.`
      );
      // Broadcast the updated list of active users to all clients immediately
      io.emit(
        "online_users",
        Object.values(activeUsers).map((u) => ({
          userId: u.userId,
          username: u.username,
          avatar_url: u.avatar_url,
        }))
      );
    }
  });

  // Handles incoming chat messages (public, private, or file)
  socket.on("chat message", async (msg) => {
    const {
      roomId,
      text,
      userId,
      username,
      avatar_url,
      message_type,
      recipient_id,
      file_data,
      file_name,
      file_type,
    } = msg;
    const reactionsJson = JSON.stringify([]); // New messages start with empty reactions

    try {
      const now = new Date();
      const insertQuery = `
                INSERT INTO chat_messages (user_id, username, message_text, room_id, message_type, recipient_id, created_at, reactions, file_data, file_name, file_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            `;
      const [result] = await db.query(insertQuery, [
        userId,
        username,
        text,
        roomId,
        message_type || "public",
        recipient_id || null,
        now,
        reactionsJson,
        file_data || null,
        file_name || null,
        file_type || null,
      ]);
      const messageId = result.insertId;
      const newMessage = {
        message_id: messageId,
        user_id: userId,
        username: username,
        message_text: text,
        room_id: roomId,
        message_type: message_type || "public",
        recipient_id: recipient_id || null,
        created_at: now.toISOString(), // Use ISO string for consistency
        edited_at: null,
        is_deleted: false,
        reactions: [],
        file_data: file_data || null,
        file_name: file_name || null,
        file_type: file_type || null,
      };

      // Update lastActivity for the user who sent the message
      if (activeUsers[userId]) {
        activeUsers[userId].lastActivity = Date.now();
        console.log(
          `User ${username} (ID: ${userId}) activity updated after sending message.`
        );
      } else {
        // If user somehow wasn't in activeUsers, add them
        activeUsers[userId] = {
          userId: userId,
          username: username || "Anonymous",
          avatar_url: avatar_url,
          sid: socket.id,
          lastActivity: Date.now(),
          currentRoomId: roomId, // Set their current room
        };
        console.log(
          `User ${username} (ID: ${userId}) added to active users via message.`
        );
      }

      // Emit the new message to relevant clients
      if (newMessage.message_type === "private" && newMessage.recipient_id) {
        // Find sender's and recipient's sockets
        const senderSocketId = activeUsers[userId]?.sid;
        const recipientSocketId = activeUsers[newMessage.recipient_id]?.sid;

        if (senderSocketId) io.to(senderSocketId).emit("message", newMessage);
        if (recipientSocketId && senderSocketId !== recipientSocketId) {
          io.to(recipientSocketId).emit("message", newMessage);
        }
        console.log(
          `Private message sent from ${username} to ${newMessage.recipient_id}`
        );
      } else {
        // Public message
        io.to(roomId).emit("message", newMessage);
        console.log(`Public message sent to ${roomId}`);
      }

      // Broadcast the updated list of active users to all clients immediately
      io.emit(
        "online_users",
        Object.values(activeUsers).map((u) => ({
          userId: u.userId,
          username: u.username,
          avatar_url: u.avatar_url,
        }))
      );
    } catch (error) {
      console.error("Error saving chat message:", error);
    }
  });

  // NEW: Handle message editing
  socket.on("edit_message", async (data) => {
    const { messageId, newText, userId } = data; // userId for authorization check
    try {
      // Fetch original message to ensure user is the sender and message exists
      const [originalMsgRows] = await db.query(
        "SELECT user_id, is_deleted, message_type, room_id, recipient_id FROM chat_messages WHERE message_id = ?",
        [messageId]
      );
      if (originalMsgRows.length === 0) {
        socket.emit("error", "Message not found.");
        return;
      }
      const originalMessage = originalMsgRows[0];

      if (originalMessage.user_id !== userId) {
        socket.emit("error", "You are not authorized to edit this message.");
        return;
      }
      if (originalMessage.is_deleted) {
        socket.emit("error", "Cannot edit a deleted message.");
        return;
      }

      const now = new Date();
      await db.query(
        "UPDATE chat_messages SET message_text = ?, edited_at = ? WHERE message_id = ?",
        [newText, now, messageId]
      );

      // Fetch the updated message to send back with all fields
      const [updatedMsgRows] = await db.query(
        `SELECT message_id, user_id, username, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type
                 FROM chat_messages
                 WHERE message_id = ?`,
        [messageId]
      );

      const updatedMessage = {
        ...updatedMsgRows[0],
        reactions: updatedMsgRows[0].reactions || [],
        file_data: updatedMsgRows[0].file_data || null,
        file_name: updatedMsgRows[0].file_name || null,
        file_type: updatedMsgRows[0].file_type || null,
      };

      // Emit update to relevant clients (public room or private participants)
      if (
        updatedMessage.message_type === "private" &&
        updatedMessage.recipient_id
      ) {
        const senderSocketId = activeUsers[userId]?.sid;
        const recipientSocketId = activeUsers[updatedMessage.recipient_id]?.sid;
        if (senderSocketId)
          io.to(senderSocketId).emit("message_updated", updatedMessage);
        if (recipientSocketId && senderSocketId !== recipientSocketId) {
          io.to(recipientSocketId).emit("message_updated", updatedMessage);
        }
      } else {
        io.to(originalMessage.room_id).emit("message_updated", updatedMessage);
      }
      console.log(`Message ${messageId} edited by user ${userId}.`);

      // Update user activity after editing
      if (activeUsers[userId]) {
        activeUsers[userId].lastActivity = Date.now();
      }
    } catch (error) {
      console.error("Error editing message:", error);
      socket.emit("error", "Failed to edit message.");
    }
  });

  // NEW: Handle message deletion
  socket.on("delete_message", async (data) => {
    const { messageId, userId } = data; // userId for authorization check
    try {
      const [originalMsgRows] = await db.query(
        "SELECT user_id, message_type, room_id, recipient_id FROM chat_messages WHERE message_id = ?",
        [messageId]
      );
      if (originalMsgRows.length === 0) {
        socket.emit("error", "Message not found.");
        return;
      }
      const originalMessage = originalMsgRows[0];

      if (originalMessage.user_id !== userId) {
        socket.emit("error", "You are not authorized to delete this message.");
        return;
      }

      // Mark as deleted instead of actual deletion to preserve history
      await db.query(
        "UPDATE chat_messages SET is_deleted = TRUE, message_text = 'This message has been deleted.', file_data = NULL, file_name = NULL, file_type = NULL, reactions = '[]' WHERE message_id = ?",
        [messageId]
      );

      // Fetch the updated message to send back with all fields (now marked deleted)
      const [updatedMsgRows] = await db.query(
        `SELECT message_id, user_id, username, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type
                 FROM chat_messages
                 WHERE message_id = ?`,
        [messageId]
      );

      const updatedMessage = {
        ...updatedMsgRows[0],
        reactions: updatedMsgRows[0].reactions || [],
        file_data: updatedMsgRows[0].file_data || null,
        file_name: updatedMsgRows[0].file_name || null,
        file_type: updatedMsgRows[0].file_type || null,
      };

      // Emit update to relevant clients (public room or private participants)
      if (
        updatedMessage.message_type === "private" &&
        updatedMessage.recipient_id
      ) {
        const senderSocketId = activeUsers[userId]?.sid;
        const recipientSocketId = activeUsers[updatedMessage.recipient_id]?.sid;
        if (senderSocketId)
          io.to(senderSocketId).emit("message_updated", updatedMessage);
        if (recipientSocketId && senderSocketId !== recipientSocketId) {
          io.to(recipientSocketId).emit("message_updated", updatedMessage);
        }
      } else {
        io.to(originalMessage.room_id).emit("message_updated", updatedMessage);
      }
      console.log(`Message ${messageId} deleted by user ${userId}.`);

      // Update user activity after deleting
      if (activeUsers[userId]) {
        activeUsers[userId].lastActivity = Date.now();
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      socket.emit("error", "Failed to delete message.");
    }
  });

  // Handles message reactions
  socket.on("react_message", async (data) => {
    const { messageId, userId, username, emoji } = data;
    if (!messageId || !userId || !username || !emoji) {
      console.warn("Invalid reaction data:", data);
      return;
    }

    try {
      // Corrected: Changed 'image_data' to 'file_data' in the SELECT query
      const [messages] = await db.query(
        "SELECT reactions, file_data, file_name, file_type, message_type, room_id, recipient_id, is_deleted FROM chat_messages WHERE message_id = ?",
        [messageId]
      );
      if (messages.length === 0) {
        socket.emit("error", "Message not found for reaction.");
        return;
      }
      if (messages[0].is_deleted) {
        // Prevent reacting to deleted messages
        socket.emit("error", "Cannot react to a deleted message.");
        return;
      }

      let currentReactions = messages[0]?.reactions || [];

      const existingReactionIndex = currentReactions.findIndex(
        (r) => r.emoji === emoji
      );

      if (existingReactionIndex !== -1) {
        const reaction = currentReactions[existingReactionIndex];
        const userIndex = reaction.userIds.indexOf(userId);

        if (userIndex !== -1) {
          reaction.userIds.splice(userIndex, 1);
          reaction.usernames.splice(userIndex, 1);
          if (reaction.userIds.length === 0) {
            currentReactions.splice(existingReactionIndex, 1);
          }
        } else {
          reaction.userIds.push(userId);
          reaction.usernames.push(username);
        }
      } else {
        currentReactions.push({
          emoji: emoji,
          userIds: [userId],
          usernames: [username],
        });
      }

      await db.query(
        "UPDATE chat_messages SET reactions = ? WHERE message_id = ?",
        [JSON.stringify(currentReactions), messageId]
      );

      const [updatedMsgRows] = await db.query(
        `SELECT message_id, user_id, username, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type
                 FROM chat_messages
                 WHERE message_id = ?`,
        [messageId]
      );

      const updatedMessage = {
        ...updatedMsgRows[0],
        reactions: updatedMsgRows[0].reactions || [],
        file_data: updatedMsgRows[0].file_data || null,
        file_name: updatedMsgRows[0].file_name || null,
        file_type: updatedMsgRows[0].file_type || null,
      };

      // Emit update to relevant clients (public room or private participants)
      if (
        updatedMessage.message_type === "private" &&
        updatedMessage.recipient_id
      ) {
        const senderSocketId = activeUsers[userId]?.sid;
        const recipientSocketId = activeUsers[updatedMessage.recipient_id]?.sid;
        if (senderSocketId)
          io.to(senderSocketId).emit("message_updated", updatedMessage);
        if (recipientSocketId && senderSocketId !== recipientSocketId) {
          io.to(recipientSocketId).emit("message_updated", updatedMessage);
        }
      } else {
        io.to(updatedMessage.room_id).emit("message_updated", updatedMessage);
      }
      console.log(
        `Broadcasted updated message ${messageId} with new reactions.`
      );

      // Update user activity after reacting
      if (activeUsers[userId]) {
        activeUsers[userId].lastActivity = Date.now();
      }
    } catch (error) {
      console.error("Error handling reaction:", error);
      socket.emit("error", "Failed to process reaction.");
    }
  });

  // Handles user typing indicator
  socket.on("typing", (data) => {
    // Broadcast to others in the room that someone is typing, exclude sender
    socket
      .to(data.roomId || PUBLIC_CHAT_ROOM_ID)
      .emit("typing", { userId: data.userId, username: data.username });
    // Update user activity on typing as well
    if (activeUsers[data.userId]) {
      activeUsers[data.userId].lastActivity = Date.now();
    }
  });

  socket.on("stop_typing", (data) => {
    // Broadcast to others in the room that someone stopped typing, exclude sender
    socket
      .to(data.roomId || PUBLIC_CHAT_ROOM_ID)
      .emit("stop_typing", { userId: data.userId });
  });

  // Handles client disconnection
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Remove the user directly from activeUsers if their socket disconnects
    let disconnectedUserId = null;
    for (const userId in activeUsers) {
      if (activeUsers[userId].sid === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }
    if (disconnectedUserId) {
      delete activeUsers[disconnectedUserId];
      console.log(
        `User ${disconnectedUserId} removed from active users due to disconnect.`
      );
      // Broadcast the updated list of active users to all clients immediately
      io.emit(
        "online_users",
        Object.values(activeUsers).map((u) => ({
          userId: u.userId,
          username: u.username,
          avatar_url: u.avatar_url,
        }))
      );
    }
  });
});

// ==========================================================
// Periodically clean up inactive users and broadcast the active list
// ==========================================================
setInterval(() => {
  const fiveMinutesAgo = Date.now() - ACTIVITY_TIMEOUT_MS;
  let usersRemovedThisCycle = 0;
  for (const userId in activeUsers) {
    if (activeUsers[userId].lastActivity < fiveMinutesAgo) {
      console.log(
        `User ${activeUsers[userId].username} (ID: ${userId}) removed due to inactivity.`
      );
      delete activeUsers[userId];
      usersRemovedThisCycle++;
    }
  }

  // Only broadcast if there was a change or if the count is different from last known
  const currentActiveUsersCount = Object.keys(activeUsers).length;
  if (
    usersRemovedThisCycle > 0 ||
    currentActiveUsersCount !== lastKnownActiveUsersCount
  ) {
    console.log(
      `Broadcasting updated online users after inactivity check. Current count: ${currentActiveUsersCount}`
    );
    io.emit(
      "online_users",
      Object.values(activeUsers).map((u) => ({
        userId: u.userId,
        username: u.username,
        avatar_url: u.avatar_url,
      }))
    );
    lastKnownActiveUsersCount = currentActiveUsersCount;
  }
}, 30 * 1000); // Run this check every 30 seconds

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running and listening on port ${PORT}`);
});
