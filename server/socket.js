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
    console.log(`Client connected: ${socket.id}`);

    // Retrieve user info from handshake query
    const userid = socket.handshake.query.userid;
    const username = socket.handshake.query.username;
    const avatar_url = socket.handshake.query.avatar_url; // Assuming avatar_url is passed

    if (userid && username) {
      activeUsers[userid] = {
        userid: userid,
        username: username,
        avatar_url: avatar_url, // Store avatar URL
        sid: socket.id,
        lastActivity: Date.now(),
        currentRoomId: PUBLIC_CHAT_ROOM_ID, // Default to public room
      };
      // Initially broadcast all online users to the new client and existing clients
      io.emit(
        "onlineUsers", // Consistent with frontend
        Object.values(activeUsers).map((u) => ({
          userid: u.userid,
          username: u.username,
          avatar_url: u.avatar_url,
        }))
      );
      console.log(`User ${username} (ID: ${userid}) connected via socket.`);
    }

    // Emitted by frontend when a user joins a specific chat room
    socket.on("joinRoom", ({ roomId, userid, username }) => {
      socket.join(roomId);
      console.log(
        `Socket ${socket.id} (User: ${username}, Room: ${roomId}) joined.`
      );
      // Update user's current room tracking
      if (activeUsers[userid]) {
        activeUsers[userid].currentRoomId = roomId;
        activeUsers[userid].lastActivity = Date.now();
      }
      // No need to emit onlineUsers here again, as it's done on connect/activity
    });

    // Emitted by frontend when a user leaves a room (e.g., switching from DM to public)
    socket.on("leaveRoom", ({ roomId, userid }) => {
      socket.leave(roomId);
      console.log(
        `Socket ${socket.id} (User: ${userid}, Room: ${roomId}) left.`
      );
      if (activeUsers[userid]) {
        activeUsers[userid].lastActivity = Date.now(); // Still active, just changed room
      }
    });

    // Emitted by frontend to fetch chat history (both public and private)
    socket.on("fetchChatHistory", async (data) => {
      const { userid, roomId, targetuserid } = data; // userid is the current logged-in user's ID
      let query;
      let params;

      if (targetuserid) {
        // It's a private chat
        const dmRoomId = getPrivateChatRoomId(userid, targetuserid);
        query = `
          SELECT message_id, userid, username, avatar_url, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type, audio_data, audio_type, audio_duration
          FROM chat_messages
          WHERE room_id = ? AND message_type = 'private'
          ORDER BY created_at ASC LIMIT 200;
        `;
        params = [dmRoomId];
        console.log(`Fetching private chat history for room: ${dmRoomId}`);
      } else {
        // It's a public chat
        query = `
          SELECT message_id, userid, username, avatar_url, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type, audio_data, audio_type, audio_duration
          FROM chat_messages
          WHERE room_id = ? AND message_type = 'public'
          ORDER BY created_at ASC LIMIT 200;
        `;
        params = [roomId];
        console.log(`Fetching public chat history for room: ${roomId}`);
      }

      try {
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
        socket.emit("chatHistory", formattedMessages); // Emitting to specific socket
        console.log(
          `Socket ${
            socket.id
          }: Sent chat history for Room ${roomId} (Target: ${
            targetuserid || "public"
          })`
        );
      } catch (error) {
        console.error(
          `Socket ${socket.id}: Error fetching chat history:`,
          error
        );
        socket.emit("error", "Failed to fetch chat history via socket.");
      }
    });

    // Handle regular text messages
    socket.on("sendMessage", async (msg) => {
      const {
        message_text,
        userid,
        username,
        avatar_url,
        room_id,
        message_type,
        recipient_id,
      } = msg;

      try {
        const now = new Date();
        const reactionsJson = JSON.stringify([]); // New messages start with empty reactions
        const insertQuery = `
          INSERT INTO chat_messages (userid, username, avatar_url, message_text, room_id, message_type, recipient_id, created_at, reactions)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
        const [result] = await db.query(insertQuery, [
          userid,
          username,
          avatar_url,
          message_text,
          room_id,
          message_type,
          recipient_id,
          now,
          reactionsJson,
        ]);

        const newMessage = {
          message_id: result.insertId,
          userid,
          username,
          avatar_url,
          message_text,
          room_id,
          message_type,
          recipient_id,
          created_at: now.toISOString(),
          edited_at: null,
          is_deleted: false,
          reactions: [],
          file_data: null, // Ensure these are null for text messages
          file_name: null,
          file_type: null,
          audio_data: null, // Ensure these are null for text messages
          audio_type: null,
          audio_duration: null,
        };

        io.to(room_id).emit("message", newMessage);
        console.log(`Text message sent to room ${room_id} by ${username}.`);
        if (activeUsers[userid]) {
          activeUsers[userid].lastActivity = Date.now();
        }
      } catch (error) {
        console.error("Error saving text message:", error);
        socket.emit("error", "Failed to send text message.");
      }
    });

    // Handle file messages
    socket.on("fileMessage", async (msg) => {
      const {
        message_text, // Can be null
        userid,
        username,
        avatar_url,
        room_id,
        message_type,
        recipient_id,
        file_data,
        file_name,
        file_type,
      } = msg;

      try {
        const now = new Date();
        const reactionsJson = JSON.stringify([]);
        const insertQuery = `
          INSERT INTO chat_messages (userid, username, avatar_url, message_text, room_id, message_type, recipient_id, created_at, reactions, file_data, file_name, file_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
        const [result] = await db.query(insertQuery, [
          userid,
          username,
          avatar_url,
          message_text, // Can be null if only file
          room_id,
          message_type,
          recipient_id,
          now,
          reactionsJson,
          file_data,
          file_name,
          file_type,
        ]);

        const newMessage = {
          message_id: result.insertId,
          userid,
          username,
          avatar_url,
          message_text,
          room_id,
          message_type,
          recipient_id,
          created_at: now.toISOString(),
          edited_at: null,
          is_deleted: false,
          reactions: [],
          file_data,
          file_name,
          file_type,
          audio_data: null, // Ensure null for file messages
          audio_type: null,
          audio_duration: null,
        };

        io.to(room_id).emit("message", newMessage);
        console.log(`File message sent to room ${room_id} by ${username}.`);
        if (activeUsers[userid]) {
          activeUsers[userid].lastActivity = Date.now();
        }
      } catch (error) {
        console.error("Error saving file message:", error);
        socket.emit("error", "Failed to send file message.");
      }
    });

    socket.on("voiceMessage", async (msg) => {
      console.log("Received voice message:", {
        userid: msg.userid,
        roomId: msg.room_id,
        audioType: msg.audio_type,
        audioDataLength: msg.audio_data ? msg.audio_data.length : 0,
        audioDuration: msg.audio_duration,
      });
      const {
        userid,
        username,
        avatar_url,
        room_id,
        message_type,
        recipient_id,
        audio_data, // Base64 string of the audio
        audio_type, // MIME type of the audio (e.g., 'audio/webm')
        audio_duration, // Duration in seconds
      } = msg;

      try {
        const now = new Date();
        const reactionsJson = JSON.stringify([]);
        const insertQuery = `
          INSERT INTO chat_messages (userid, username, avatar_url, room_id, message_type, recipient_id, created_at, reactions, audio_data, audio_type, audio_duration)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
        const [result] = await db.query(insertQuery, [
          userid,
          username,
          avatar_url,
          room_id,
          message_type,
          recipient_id,
          now,
          reactionsJson,
          audio_data,
          audio_type,
          audio_duration,
        ]);

        const newMessage = {
          message_id: result.insertId,
          userid,
          username,
          avatar_url,
          message_text: null, // Voice messages don't have text directly
          room_id,
          message_type,
          recipient_id,
          created_at: now.toISOString(),
          edited_at: null,
          is_deleted: false,
          reactions: [],
          file_data: null,
          file_name: null,
          file_type: null,
          audio_data, // Include audio data
          audio_type,
          audio_duration,
        };

        io.to(room_id).emit("message", newMessage);
        console.log(
          `Voice message sent to room ${room_id} by ${username}. Duration: ${audio_duration}s`
        );
        if (activeUsers[userid]) {
          activeUsers[userid].lastActivity = Date.now();
        }
      } catch (error) {
        console.error("Error saving voice message:", error);
        socket.emit("error", "Failed to send voice message.");
      }
    });

    // Handle message editing
    socket.on("editMessage", async (data) => {
      const { message_id, new_text, userid } = data;
      try {
        const [originalMsgRows] = await db.query(
          "SELECT userid, is_deleted, message_type, room_id, recipient_id, file_data, file_type, audio_data, audio_type FROM chat_messages WHERE message_id = ?",
          [message_id]
        );
        if (originalMsgRows.length === 0) {
          socket.emit("error", "Message not found.");
          return;
        }
        const originalMessage = originalMsgRows[0];

        if (originalMessage.userid !== userid) {
          socket.emit(
            "error",
            "You are not authorized to edit this message."
          );
          return;
        }
        if (originalMessage.is_deleted) {
          socket.emit("error", "Cannot edit a deleted message.");
          return;
        }
        // Prevent editing if it's a file or audio message (only text can be edited)
        if (originalMessage.file_data || originalMessage.audio_data) {
          socket.emit(
            "error",
            "Cannot edit file or voice messages. Only text content can be edited."
          );
          return;
        }

        const now = new Date();
        await db.query(
          "UPDATE chat_messages SET message_text = ?, edited_at = ? WHERE message_id = ?",
          [new_text, now, message_id]
        );

        const [updatedMsgRows] = await db.query(
          `SELECT message_id, userid, username, avatar_url, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type, audio_data, audio_type, audio_duration
            FROM chat_messages
            WHERE message_id = ?`,
          [message_id]
        );

        const updatedMessage = {
          ...updatedMsgRows[0],
          reactions: parseReactionsSafely(
            updatedMsgRows[0].reactions,
            updatedMsgRows[0].message_id
          ),
          file_data: updatedMsgRows[0].file_data || null,
          file_name: updatedMsgRows[0].file_name || null,
          file_type: updatedMsgRows[0].file_type || null,
          audio_data: updatedMsgRows[0].audio_data || null,
          audio_type: updatedMsgRows[0].audio_type || null,
          audio_duration: updatedMsgRows[0].audio_duration || null,
        };

        const roomToEmit =
          updatedMessage.message_type === "private" &&
          updatedMessage.recipient_id
            ? getPrivateChatRoomId(userid, updatedMessage.recipient_id)
            : updatedMessage.room_id;

        io.to(roomToEmit).emit("messageUpdated", updatedMessage);
        console.log(`Message ${message_id} edited by user ${userid}.`);

        if (activeUsers[userid]) {
          activeUsers[userid].lastActivity = Date.now();
        }
      } catch (error) {
        console.error("Error editing message:", error);
        socket.emit("error", "Failed to edit message.");
      }
    });

    // Handle message deletion
    socket.on("deleteMessage", async (data) => {
      const { message_id, userid } = data;
      try {
        const [originalMsgRows] = await db.query(
          "SELECT userid, message_type, room_id, recipient_id FROM chat_messages WHERE message_id = ?",
          [message_id]
        );
        if (originalMsgRows.length === 0) {
          socket.emit("error", "Message not found.");
          return;
        }
        const originalMessage = originalMsgRows[0];

        if (originalMessage.userid !== userid) {
          socket.emit(
            "error",
            "You are not authorized to delete this message."
          );
          return;
        }

        await db.query(
          "UPDATE chat_messages SET is_deleted = TRUE, message_text = 'This message has been deleted.', file_data = NULL, file_name = NULL, file_type = NULL, audio_data = NULL, audio_type = NULL, audio_duration = NULL, reactions = '[]' WHERE message_id = ?",
          [message_id]
        );

        const [updatedMsgRows] = await db.query(
          `SELECT message_id, userid, username, avatar_url, message_text, room_id, message_type, recipient_id, created_at, edited_at, is_deleted, reactions, file_data, file_name, file_type, audio_data, audio_type, audio_duration
            FROM chat_messages
            WHERE message_id = ?`,
          [message_id]
        );

        const updatedMessage = {
          ...updatedMsgRows[0],
          reactions: parseReactionsSafely(
            updatedMsgRows[0].reactions,
            updatedMsgRows[0].message_id
          ),
          file_data: updatedMsgRows[0].file_data || null,
          file_name: updatedMsgRows[0].file_name || null,
          file_type: updatedMsgRows[0].file_type || null,
          audio_data: updatedMsgRows[0].audio_data || null,
          audio_type: updatedMsgRows[0].audio_type || null,
          audio_duration: updatedMsgRows[0].audio_duration || null,
        };

        const roomToEmit =
          updatedMessage.message_type === "private" &&
          updatedMessage.recipient_id
            ? getPrivateChatRoomId(userid, updatedMessage.recipient_id)
            : updatedMessage.room_id;

        io.to(roomToEmit).emit("messageUpdated", updatedMessage);
        console.log(`Message ${message_id} deleted by user ${userid}.`);

        if (activeUsers[userid]) {
          activeUsers[userid].lastActivity = Date.now();
        }
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("error", "Failed to delete message.");
      }
    });

    // Handles message reactions
    socket.on("reactToMessage", async (data) => {
      const { message_id, userid, username, emoji } = data;
      if (!message_id || !userid || !username || !emoji) {
        console.warn("Invalid reaction data:", data);
        return;
      }

      try {
        const [messages] = await db.query(
          "SELECT reactions, file_data, file_name, file_type, audio_data, audio_type, audio_duration, message_type, room_id, recipient_id, is_deleted FROM chat_messages WHERE message_id = ?",
          [message_id]
        );

        if (messages.length === 0) {
          socket.emit("error", "Message not found for reaction.");
          return;
        }

        const message = messages[0];
        if (message.is_deleted) {
          socket.emit("error", "Cannot react to a deleted message.");
          return;
        }

        let currentReactions = parseReactionsSafely(
          message.reactions,
          message_id
        );

        const reactionIndex = currentReactions.findIndex(
          (r) => r.emoji === emoji
        );
        if (reactionIndex !== -1) {
          const useridx =
            currentReactions[reactionIndex].userids.indexOf(userid);
          if (useridx !== -1) {
            // User already reacted with this emoji, so remove their reaction
            currentReactions[reactionIndex].userids.splice(useridx, 1);
            currentReactions[reactionIndex].usernames.splice(useridx, 1);
            if (currentReactions[reactionIndex].userids.length === 0) {
              // If no users left for this emoji, remove the emoji reaction entry
              currentReactions.splice(reactionIndex, 1);
            }
          } else {
            // User reacted with a new emoji, add their reaction
            currentReactions[reactionIndex].userids.push(userid);
            currentReactions[reactionIndex].usernames.push(username);
          }
        } else {
          // New emoji reaction
          currentReactions.push({
            emoji: emoji,
            userids: [userid],
            usernames: [username],
          });
        }

        await db.query(
          "UPDATE chat_messages SET reactions = ? WHERE message_id = ?",
          [JSON.stringify(currentReactions), message_id]
        );

        const updatedMessage = {
          ...message, // Keep all other message properties
          reactions: currentReactions, // Send the updated parsed object to the client
          // Ensure file/audio data are also passed through
          file_data: message.file_data || null,
          file_name: message.file_name || null,
          file_type: message.file_type || null,
          audio_data: message.audio_data || null,
          audio_type: message.audio_type || null,
          audio_duration: message.audio_duration || null,
        };

        const roomToEmit =
          message.message_type === "private" && message.recipient_id
            ? getPrivateChatRoomId(userid, message.recipient_id)
            : message.room_id;

        io.to(roomToEmit).emit("messageUpdated", updatedMessage);
        console.log(
          `Reaction '${emoji}' processed for message ${message_id} by user ${userid}`
        );

        if (activeUsers[userid]) {
          activeUsers[userid].lastActivity = Date.now();
        }
      } catch (error) {
        console.error("Error reacting to message:", error);
        socket.emit("error", "Failed to react to message.");
      }
    });

    // Handles user typing indicator
    socket.on("typing", (data) => {
      // Broadcast to others in the room that someone is typing, exclude sender
      const roomToSend =
        data.message_type === "private" && data.recipient_id
          ? getPrivateChatRoomId(data.userid, data.recipient_id)
          : data.roomId || PUBLIC_CHAT_ROOM_ID;

      // Only emit typing if the sender is not the current socket
      socket.to(roomToSend).emit("typing", {
        userid: data.userid,
        username: data.username,
        roomId: roomToSend,
      });
      if (activeUsers[data.userid]) {
        activeUsers[data.userid].lastActivity = Date.now();
      }
    });

    socket.on("stopTyping", (data) => {
      const roomToSend =
        data.message_type === "private" && data.recipient_id
          ? getPrivateChatRoomId(data.userid, data.recipient_id)
          : data.roomId || PUBLIC_CHAT_ROOM_ID;
      socket.to(roomToSend).emit("stopTyping", {
        userid: data.userid,
        roomId: roomToSend,
      });
    });

    // Handles client disconnection
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      let disconnecteduserid = null;
      for (const userid in activeUsers) {
        if (activeUsers[userid].sid === socket.id) {
          disconnecteduserid = userid;
          break;
        }
      }
      if (disconnecteduserid) {
        delete activeUsers[disconnecteduserid];
        console.log(
          `User ${disconnecteduserid} removed from active users due to disconnect.`
        );
        // Immediately broadcast updated online users list
        io.emit(
          "onlineUsers", // Consistent with frontend
          Object.values(activeUsers).map((u) => ({
            userid: u.userid,
            username: u.username,
            avatar_url: u.avatar_url,
          }))
        );
      }
    });

    // === Voice/Video Call Related Socket Events (from your original snippet) ===
    socket.on("voice-offer", ({ offer, to }) => {
      io.to(to).emit("voice-offer", { offer, from: socket.id });
    });

    socket.on("voice-answer", ({ answer, to }) => {
      io.to(to).emit("voice-answer", { answer, from: socket.id });
    });

    socket.on("voice-candidate", ({ candidate, to }) => {
      io.to(to).emit("voice-candidate", { candidate, from: socket.id });
    });
    // ...inside io.on("connection", (socket) => { ... })...

    socket.on("getRegisteredUsers", async () => {
      try {
        // Exclude sensitive info, only send what's needed for chat
        const [users] = await db.query(
          "SELECT userid, username, avatar_url FROM users WHERE is_verified = 1"
        );
        socket.emit("registeredUsers", users);
      } catch (error) {
        console.error("Error fetching registered users:", error);
        socket.emit("registeredUsers", []); // Send empty list on error
      }
    });
  });

  // Periodically clean up inactive users and broadcast the active list
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
