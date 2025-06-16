const dbConnection = require("../config/dbConfig"); // Added for database operations
let onlineUsers = {}; // Stores { userId: socketId }

function initializeSocketIo(io) {
  io.on("connection", (socket) => {
    console.log(`[Socket.js] New client connected: ${socket.id}`);

    // Event from client to register their userId
    socket.on("user_connect", async (userId) => {
      if (!userId) {
        console.log(
          "[Socket.js] Connection attempt with no userId. Socket: ",
          socket.id
        );
        return;
      }

      const existingSocketId = onlineUsers[userId];
      if (existingSocketId && existingSocketId !== socket.id) {
        console.log(
          `[Socket.js] User ${userId} already connected with socket ${existingSocketId}. Disconnecting old socket.`
        );
        const oldSocket = io.sockets.sockets.get(existingSocketId);
        if (oldSocket) {
          oldSocket.disconnect(true); // true for immediate disconnect
        }
      }

      // Add/update user to onlineUsers map
      onlineUsers[userId] = socket.id;
      socket.userId = userId; // Store userId on the socket for later use (e.g., in disconnect, send_message)

      console.log(
        `[Socket.js] User ${userId} connected. Socket ID: ${socket.id}. Current online users:`,
        Object.keys(onlineUsers).length
      );

      // Broadcast the updated list of online user IDs to ALL clients
      io.emit("online_users_updated", Object.keys(onlineUsers));
      console.log(
        "[Socket.js] Emitted online_users_updated:",
        Object.keys(onlineUsers)
      );
    });

    socket.on("ping_server", (data) => {
      console.log("[Socket.js] Ping received from client:", data);
      socket.emit("pong_client", {
        message: "Pong from server via socket.js!",
      });
    });

    socket.on("disconnect", () => {
      let disconnectedUserId = null;
      // Find the userId associated with the disconnecting socket
      for (const userId_iter in onlineUsers) {
        if (onlineUsers[userId_iter] === socket.id) {
          disconnectedUserId = userId_iter;
          break;
        }
      }

      if (disconnectedUserId) {
        delete onlineUsers[disconnectedUserId];
        console.log(
          `[Socket.js] User ${disconnectedUserId} disconnected (socket ${socket.id}). Remaining online users:`,
          Object.keys(onlineUsers).length
        );
        // Broadcast the updated list of online user IDs to ALL remaining clients
        io.emit("online_users_updated", Object.keys(onlineUsers));
        console.log(
          "[Socket.js] Emitted online_users_updated after disconnect:",
          Object.keys(onlineUsers)
        );
      } else {
        console.log(
          `[Socket.js] Socket ${socket.id} disconnected, but was not found in onlineUsers map or already cleaned up.`
        );
      }
    });

    socket.on("send_private_message", async ({ receiverId, content }) => {
      const senderId = socket.userId; // Retrieve senderId stored on the socket

      if (!senderId) {
        console.error(
          "[Socket.js] Error: senderId not found on socket. Message not sent."
        );
        socket.emit("send_private_message_error", {
          message: "Authentication error, message not sent.",
        });
        return;
      }

      if (!receiverId || !content) {
        console.error(
          "[Socket.js] Error: receiverId or content missing. Message not sent."
        );
        socket.emit("send_private_message_error", {
          message: "Receiver ID or content missing.",
        });
        return;
      }

      try {
        const insertQuery =
          "INSERT INTO private_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)";
        const [result] = await dbConnection.query(insertQuery, [
          senderId,
          receiverId,
          content,
        ]);
        const messageId = result.insertId;

        const [rows] = await dbConnection.query(
          "SELECT message_id, sender_id, receiver_id, content, timestamp, is_read FROM private_messages WHERE message_id = ?",
          [messageId]
        );
        const newMessage = rows[0];

        // Send confirmation back to sender
        socket.emit("private_message_sent_confirmation", newMessage);

        const receiverSocketId = onlineUsers[receiverId];
        if (receiverSocketId) {
          // Emit event to update the chat window if open
          io.to(receiverSocketId).emit("receive_private_message", newMessage);
          console.log(
            `[Socket.js] Message from ${senderId} to ${receiverId} (socket: ${receiverSocketId}) delivered.`
          );

          // Prepare and emit the separate notification event
          try {
            const [senderProfileRows] = await dbConnection.query(
              "SELECT username, firstname, lastname FROM users WHERE userid = ?",
              [newMessage.sender_id]
            );

            if (senderProfileRows.length > 0) {
              const senderProfile = senderProfileRows[0];
              const notificationData = {
                message_id: newMessage.message_id,
                sender_id: newMessage.sender_id,
                sender_username: senderProfile.username,
                sender_name: `${senderProfile.firstname} ${senderProfile.lastname}`,
                content_preview:
                  newMessage.content.substring(0, 50) +
                  (newMessage.content.length > 50 ? "..." : ""),
                timestamp: newMessage.timestamp,
                receiver_id: newMessage.receiver_id, // useful for client to double check
              };
              io.to(receiverSocketId).emit(
                "new_chat_message_notification",
                notificationData
              );
              console.log(
                `[Socket.js] Notification sent to ${receiverId} (socket: ${receiverSocketId}) for message from ${newMessage.sender_id}`
              );
            } else {
              console.error(
                `[Socket.js] Could not find sender profile for ID: ${newMessage.sender_id} to build notification.`
              );
            }
          } catch (profileError) {
            console.error(
              "[Socket.js] Error fetching sender profile for notification:",
              profileError
            );
          }
        } else {
          console.log(
            `[Socket.js] User ${receiverId} is not online. Message from ${senderId} stored, no real-time notification.`
          );
        }
      } catch (error) {
        console.error("[Socket.js] Error sending private message:", error);
        socket.emit("send_private_message_error", {
          message: "Server error, message not sent.",
        });
      }
    });

    // Typing indicator events
    socket.on("user_typing_started", ({ receiverId }) => {
      const senderId = socket.userId;
      if (!senderId) {
        console.error(
          "[Socket.js] Typing started: senderId not found on socket."
        );
        return;
      }
      if (!receiverId) {
        console.error("[Socket.js] Typing started: receiverId not provided.");
        return;
      }

      const receiverSocketId = onlineUsers[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("show_typing_indicator", {
          senderId: senderId,
        });
        // console.log(`[Socket.js] User ${senderId} started typing to user ${receiverId}`);
      } else {
        // console.log(`[Socket.js] User ${senderId} started typing to user ${receiverId}, but receiver is offline.`);
      }
    });

    socket.on("user_typing_stopped", ({ receiverId }) => {
      const senderId = socket.userId;
      if (!senderId) {
        console.error(
          "[Socket.js] Typing stopped: senderId not found on socket."
        );
        return;
      }
      if (!receiverId) {
        console.error("[Socket.js] Typing stopped: receiverId not provided.");
        return;
      }

      const receiverSocketId = onlineUsers[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("hide_typing_indicator", {
          senderId: senderId,
        });
        // console.log(`[Socket.js] User ${senderId} stopped typing to user ${receiverId}`);
      } else {
        // console.log(`[Socket.js] User ${senderId} stopped typing to user ${receiverId}, but receiver is offline.`);
      }
    });
  });
  console.log(
    "[Socket.js] Socket.IO initialized with custom handlers from socket.js."
  );
}

// Function to get a socket ID for a given user ID
function getSocketIdForUser(userId) {
  return onlineUsers[userId];
}

module.exports = { initializeSocketIo, getSocketIdForUser, onlineUsers };
