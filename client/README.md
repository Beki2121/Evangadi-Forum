# EVANGADI FORUM PROJECT - EVANGADI BOOTCAMP

## project collaboration links

- Github Repo https://github.com/Beki2121/Evangadi-Forum

test for branching
GIT PULL, PUSH AND PULL REQUEST TEST WITH THE BELOVED TEAM MATES 🤝
Hani: Hi everyone
Aman:  
 Sofi:
Selam:
Atsie:
Hiwot:
Degefa:
Kine:
Mohammed:
Micki:
import React, { useState, useEffect, useRef, useContext } from "react";
import { io } from "socket.io-client";
import styles from "./PublicChat.module.css"; // Import the CSS module
import { UserState } from "../../App.jsx"; // Assuming UserState is defined here
import {
FiSend,
FiSmile,
FiImage,
FiX,
FiEdit,
FiTrash2,
FiDownload,
FiUsers,
FiMessageCircle,
} from "react-icons/fi"; // Added more icons
import EmojiPicker from "emoji-picker-react";
import Loader from "../Loader/Loader.jsx"; // Assuming you have a loader component
import Swal from "sweetalert2"; // For confirmations

const SOCKET_SERVER_URL = "http://localhost:5000"; // IMPORTANT: Ensure your Socket.IO server is running on this URL
const PUBLIC_CHAT_ROOM_ID = "stackoverflow_lobby"; // Unique ID for the public chat room

// Define common reaction emojis
const COMMON_REACTIONS = ["👍", "❤️", "😂", "🔥", "🎉"];

const PublicChat = () => {
// Access user information from context
const { user } = useContext(UserState);

// State variables for chat functionality
const [socket, setSocket] = useState(null);
const [messages, setMessages] = useState([]);
const [input, setInput] = useState("");
const [loadingHistory, setLoadingHistory] = useState(true);
const [isTyping, setIsTyping] = useState(false);
const [onlineUsers, setOnlineUsers] = useState([]); // State to hold list of online users
const [showReactionMenuForMessageId, setShowReactionMenuForMessageId] =
useState(null); // Stores message_id if mini palette is open
const [showFullReactionEmojiPicker, setShowFullReactionEmojiPicker] =
useState(null); // Stores message_id if full picker is open
const [selectedImage, setSelectedImage] = useState(null); // State to hold selected image Base64 data
const [selectedFile, setSelectedFile] = useState(null); // State for general file data {data: Base64, name: string, type: string}
const fileInputRef = useRef(null); // Ref for the hidden file input (for images and general files)

const [chatMode, setChatMode] = useState("public"); // 'public' or 'private'
const [currentDmRecipient, setCurrentDmRecipient] = useState(null); // {userId, username}
const [editingMessageId, setEditingMessageId] = useState(null); // ID of the message being edited
const [editingMessageText, setEditingMessageText] = useState(""); // Text of the message being edited

// Refs for managing DOM elements and timeouts
const typingTimeoutRef = useRef(null);
const messagesEndRef = useRef(null); // Ref to scroll to the latest message
const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false); // Renamed for clarity
const inputEmojiPickerRef = useRef(null);
const inputEmojiButtonRef = useRef(null);
const messageBubbleRefs = useRef({}); // To store refs for each message bubble

// Effect hook for connecting to Socket.IO and setting up event listeners
useEffect(() => {
const newSocket = io(SOCKET_SERVER_URL, {
transports: ["websocket", "polling"],
});
setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to Socket.IO server.");
      // Send join_room event based on current chat mode
      if (chatMode === "public") {
        newSocket.emit("join_room", PUBLIC_CHAT_ROOM_ID);
        newSocket.emit("fetch_chat_history", {
          roomId: PUBLIC_CHAT_ROOM_ID,
          userId: user?.userid,
        });
      } else if (chatMode === "private" && currentDmRecipient) {
        // For private chats, the 'room' can be based on the sorted user IDs
        const dmRoomId = [user.userid, currentDmRecipient.userId]
          .sort()
          .join("-");
        newSocket.emit("join_room", dmRoomId);
        newSocket.emit("fetch_chat_history", {
          roomId: dmRoomId,
          userId: user?.userid,
          targetUserId: currentDmRecipient.userId,
        });
      }

      if (user?.userid && user?.username) {
        newSocket.emit("user_online", {
          userId: user.userid,
          username: user.username,
          avatar_url: user.avatar_url,
        });
      }
    });

    newSocket.on("message", (message) => {
      console.log("New message received:", message);
      // Only add message if it belongs to the currently active chat mode/recipient
      const isForCurrentPublicChat =
        message.message_type === "public" &&
        message.room_id === PUBLIC_CHAT_ROOM_ID &&
        chatMode === "public";
      const isForCurrentPrivateChat =
        message.message_type === "private" &&
        chatMode === "private" &&
        currentDmRecipient &&
        ((message.user_id === user?.userid &&
          message.recipient_id === currentDmRecipient.userId) ||
          (message.user_id === currentDmRecipient.userId &&
            message.recipient_id === user?.userid));

      if (isForCurrentPublicChat || isForCurrentPrivateChat) {
        setMessages((prev) => [...prev, message]);
      }
      setIsTyping(false);
    });

    newSocket.on("chat_history", (history) => {
      console.log("Chat history received:", history);
      setMessages(
        history.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      );
      setLoadingHistory(false);
    });

    newSocket.on("online_users", (users) => {
      console.log("Online users updated:", users);
      setOnlineUsers(users);
    });

    // Listener for message updates (e.g., when a message is reacted to, edited, or deleted)
    newSocket.on("message_updated", (updatedMessage) => {
      console.log("Message updated from server:", updatedMessage);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_id === updatedMessage.message_id ? updatedMessage : msg
        )
      );
    });

    newSocket.on("typing", (data) => {
      if (data.userId !== user?.userid) {
        setIsTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      }
    });

    newSocket.on("stop_typing", (data) => {
      if (data.userId !== user?.userid) {
        clearTimeout(typingTimeoutRef.current);
        setIsTyping(false);
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server.");
      setSocket(null);
      if (user?.userid) {
        newSocket.emit("user_offline", { userId: user.userid });
      }
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
    });

    newSocket.on("error", (errorMessage) => {
      Swal.fire({
        icon: "error",
        title: "Chat Error",
        text: errorMessage,
      });
    });

    return () => {
      newSocket.disconnect();
      clearTimeout(typingTimeoutRef.current);
    };

}, [user, chatMode, currentDmRecipient]); // Reconnect when chat mode or DM recipient changes

// Effect hook to scroll to the bottom of the messages container
useEffect(() => {
messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [
messages,
isTyping,
showReactionMenuForMessageId,
showFullReactionEmojiPicker,
editingMessageId,
]);

// Effect hook to close emoji pickers when clicking outside
useEffect(() => {
const handleClickOutside = (event) => {
// Close input emoji picker
if (
inputEmojiPickerRef.current &&
!inputEmojiPickerRef.current.contains(event.target) &&
inputEmojiButtonRef.current &&
!inputEmojiButtonRef.current.contains(event.target)
) {
setShowInputEmojiPicker(false);
}

      // Close reaction menu or full reaction picker
      if (
        showReactionMenuForMessageId !== null ||
        showFullReactionEmojiPicker !== null
      ) {
        const isClickInsideReactionMenu = event.target.closest(
          `.${styles.reactionMenu}`
        );
        const isClickInsideFullReactionPicker = event.target.closest(
          `.${styles.reactionEmojiPicker}`
        );
        const isClickOnReactButton = event.target.closest(
          `.${styles.reactButton}`
        );

        if (
          !isClickInsideReactionMenu &&
          !isClickInsideFullReactionPicker &&
          !isClickOnReactButton
        ) {
          setShowReactionMenuForMessageId(null);
          setShowFullReactionEmojiPicker(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };

}, [
showInputEmojiPicker,
showReactionMenuForMessageId,
showFullReactionEmojiPicker,
]);

const handleInputChange = (e) => {
setInput(e.target.value);
if (socket) {
if (e.target.value.trim().length > 0) {
socket.emit("typing", {
userId: user?.userid,
username: user?.username,
roomId:
chatMode === "public"
? PUBLIC_CHAT_ROOM_ID
: [user.userid, currentDmRecipient.userId].sort().join("-"),
});
} else {
socket.emit("stop_typing", {
userId: user?.userid,
roomId:
chatMode === "public"
? PUBLIC_CHAT_ROOM_ID
: [user.userid, currentDmRecipient.userId].sort().join("-"),
});
}
}
clearTimeout(typingTimeoutRef.current);
typingTimeoutRef.current = setTimeout(() => {
if (socket)
socket.emit("stop_typing", {
userId: user?.userid,
roomId:
chatMode === "public"
? PUBLIC_CHAT_ROOM_ID
: [user.userid, currentDmRecipient.userId].sort().join("-"),
});
}, 1000);
};

const sendMessage = (e) => {
e.preventDefault();
const messageText = input.trim();

    if (editingMessageId) {
      handleEditMessageConfirm();
      return;
    }

    if ((messageText || selectedImage || selectedFile) && socket) {
      const messagePayload = {
        roomId: PUBLIC_CHAT_ROOM_ID, // Default for public messages, but will be overwritten for private
        text: messageText,
        userId: user?.userid || null,
        username: user?.username || "Anonymous",
        avatar_url: user?.avatar_url || null,
        message_type: chatMode, // 'public' or 'private'
        recipient_id:
          chatMode === "private" && currentDmRecipient
            ? currentDmRecipient.userId
            : null,
        reactions: [],
        file_data: selectedFile ? selectedFile.data : selectedImage, // Use file_data for any file
        file_name: selectedFile
          ? selectedFile.name
          : selectedImage
          ? "image.png"
          : null, // Generic name for images, actual for other files
        file_type: selectedFile
          ? selectedFile.type
          : selectedImage
          ? "image/png"
          : null, // Generic type for images, actual for other files
      };

      console.log("Sending message:", messagePayload);
      socket.emit("chat message", messagePayload);

      setInput("");
      setSelectedImage(null); // Clear selected image
      setSelectedFile(null); // Clear selected file
      setShowInputEmojiPicker(false);
      clearTimeout(typingTimeoutRef.current);
      socket.emit("stop_typing", {
        userId: user?.userid,
        roomId:
          chatMode === "public"
            ? PUBLIC_CHAT_ROOM_ID
            : [user.userid, currentDmRecipient.userId].sort().join("-"),
      });
    }

};

const onInputEmojiClick = (emojiObject) => {
setInput((prev) => prev + emojiObject.emoji);
setShowInputEmojiPicker(false); // Close after selection
};

const handleReaction = (messageId, emoji) => {
if (!user?.userid) {
Swal.fire({
icon: "warning",
title: "Login Required",
text: "You must be logged in to react to messages.",
});
return;
}
if (!socket) {
Swal.fire({
icon: "error",
title: "Connection Error",
text: "Not connected to chat server.",
});
return;
}

    socket.emit("react_message", {
      messageId,
      userId: user.userid,
      username: user.username,
      emoji: emoji,
    });

    // Close reaction menus after interaction
    setShowReactionMenuForMessageId(null);
    setShowFullReactionEmojiPicker(null);

};

const formatTimestamp = (timestamp) => {
const date = new Date(timestamp);
return date.toLocaleString(undefined, {
year: "numeric",
month: "short",
day: "numeric",
hour: "2-digit",
minute: "2-digit",
});
};

const getUserInitial = (username) => {
return username ? username.charAt(0).toUpperCase() : "?";
};

const openFullReactionPicker = (messageId) => {
setShowFullReactionEmojiPicker(messageId);
setShowReactionMenuForMessageId(null); // Close mini menu
};

// Handle any file selection (image or otherwise)
const handleFileSelect = (event) => {
const file = event.target.files[0];
if (file) {
if (file.size > 5 _ 1024 _ 1024) {
// Limit to 5MB for Base64 transfer
Swal.fire({
icon: "warning",
title: "File Too Large",
text: "File size exceeds 5MB. Please choose a smaller file.",
});
return;
}

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile({
          data: reader.result, // Base64 string
          name: file.name,
          type: file.type,
        });
        setSelectedImage(null); // Clear image if a general file is selected
        setInput(""); // Clear text input
      };
      reader.readAsDataURL(file);
    }

};

// Trigger hidden file input click
const triggerFileInput = () => {
fileInputRef.current.click();
};

// Function to download Base64 file
const downloadFile = (fileData, fileName, fileType) => {
if (!fileData) {
Swal.fire({
icon: "error",
title: "Download Error",
text: "No file data available.",
});
return;
}
try {
const link = document.createElement("a");
link.href = fileData;
link.download = fileName || "downloaded_file"; // Use provided name or generic
link.target = "\_blank"; // Open in new tab
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
} catch (error) {
console.error("Error during file download:", error);
Swal.fire({
icon: "error",
title: "Download Failed",
text: "Could not download the file.",
});
}
};

// Function to start editing a message
const startEditingMessage = (message) => {
setEditingMessageId(message.message_id);
setEditingMessageText(message.message_text);
setInput(message.message_text); // Pre-fill input with message text
setSelectedImage(null); // Clear image/file selection when editing text
setSelectedFile(null);
setShowInputEmojiPicker(false); // Close emoji picker
};

// Function to confirm and send edited message
const handleEditMessageConfirm = () => {
if (editingMessageId && editingMessageText.trim() && socket) {
socket.emit("edit_message", {
messageId: editingMessageId,
newText: editingMessageText.trim(),
userId: user?.userid,
});
setEditingMessageId(null); // Clear editing state
setEditingMessageText("");
setInput(""); // Clear input field
} else {
Swal.fire({
icon: "warning",
title: "Empty Message",
text: "Edited message cannot be empty.",
});
}
};

// Function to cancel editing
const cancelEditing = () => {
setEditingMessageId(null);
setEditingMessageText("");
setInput(""); // Clear input field
setSelectedImage(null); // Re-enable normal sending
setSelectedFile(null);
};

// Function to delete a message
const handleDeleteMessage = async (messageId) => {
if (!user?.userid) {
Swal.fire({
icon: "warning",
title: "Login Required",
text: "You must be logged in to delete messages.",
});
return;
}
if (!socket) {
Swal.fire({
icon: "error",
title: "Connection Error",
text: "Not connected to chat server.",
});
return;
}

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You will not be able to recover this message!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      socket.emit("delete_message", {
        messageId,
        userId: user.userid,
      });
    }

};

// Function to switch chat mode (Public/Private)
const switchChatMode = (mode, recipient = null) => {
if (!user?.userid && mode === "private") {
Swal.fire({
icon: "warning",
title: "Login Required",
text: "You must be logged in to start private chats.",
});
return;
}
setChatMode(mode);
setCurrentDmRecipient(recipient);
setMessages([]); // Clear messages when switching mode
setLoadingHistory(true); // Re-fetch history
setInput("");
setSelectedImage(null);
setSelectedFile(null);
setEditingMessageId(null);
setEditingMessageText("");
// Re-establish socket connection to join correct room and fetch history
if (socket) {
socket.disconnect(); // Disconnect current socket
setSocket(null); // Force useEffect to re-initialize
}
};

return (

<div className={styles.publicChatContainer}>
<header className={styles.chatHeader}>
<h2 className={styles.chatTitle}>
{chatMode === "public"
? "Evangadi Public Chat"
: `DM with ${currentDmRecipient?.username || "Unknown User"}`}
</h2>
<div className={styles.headerControls}>
<button
className={`${styles.chatModeButton} ${
              chatMode === "public" ? styles.activeMode : ""
            }`}
onClick={() => switchChatMode("public")}
title="Switch to Public Chat" >
<FiUsers className={styles.chatModeIcon} /> Public
</button>
<button
className={`${styles.chatModeButton} ${
              chatMode === "private" ? styles.activeMode : ""
            }`}
onClick={() => switchChatMode("private", currentDmRecipient)} // Allow switching to private (retains current recipient if exists)
disabled={!user?.userid}
title="Switch to Private Chat" >
<FiMessageCircle className={styles.chatModeIcon} /> Private
</button>

          <div className={styles.onlineUsersButtonWrapper}>
            <button
              className={styles.onlineUsersButton}
              onClick={() => {
                /* You can add a modal here to show detailed user list */
              }}
              title="View Online Users"
            >
              Online ({onlineUsers.length})
            </button>
          </div>
        </div>
      </header>

      <div className={styles.onlineUsersDisplay}>
        <strong>Online: </strong>
        {onlineUsers.length > 0 ? (
          onlineUsers.map((u) => (
            <span key={u.userId} className={styles.onlineUserTag}>
              <span className={styles.onlineIndicator}></span>
              {u.username}
              {u.userId !== user?.userid && ( // Don't allow DMing self
                <button
                  className={styles.dmButton}
                  onClick={() => switchChatMode("private", u)}
                  title={`Start private chat with ${u.username}`}
                >
                  DM
                </button>
              )}
            </span>
          ))
        ) : (
          <span className={styles.noOnlineUsers}>No one else is online.</span>
        )}
      </div>

      <section
        className={styles.messagesContainer}
        aria-live="polite"
        role="log"
      >
        {loadingHistory ? (
          <div className={styles.loadingMessage}>
            <Loader type="ThreeDots" color="#007bff" height={30} width={30} />
            <p className={styles.loadingText}>Loading chat history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyChat}>
            {chatMode === "public"
              ? "No public messages yet. Be the first to start a conversation!"
              : `No private messages with ${
                  currentDmRecipient?.username || "this user"
                } yet.`}
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMyMessage = msg.user_id === user?.userid;
            const isFileMessage = msg.file_data && msg.file_name;
            const isImage =
              isFileMessage &&
              msg.file_type &&
              msg.file_type.startsWith("image/");
            const isDeleted = msg.is_deleted;
            const isBeingEdited = editingMessageId === msg.message_id;

            return (
              <article
                key={msg.message_id || index}
                className={`${styles.messageArticle} ${
                  isMyMessage ? styles.myMessageAlign : styles.otherMessageAlign
                }`}
              >
                {msg.avatar_url ? (
                  <img
                    src={msg.avatar_url}
                    alt={`${msg.username}'s avatar`}
                    className={styles.messageAvatar}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://placehold.co/32x32/ff6600/white?text=?";
                    }}
                  />
                ) : (
                  <div className={styles.messageAvatarPlaceholder}>
                    {getUserInitial(msg.username)}
                  </div>
                )}

                <div
                  className={`${styles.messageBubble} ${
                    isMyMessage
                      ? styles.myMessageBubble
                      : styles.otherMessageBubble
                  } ${isDeleted ? styles.deletedMessage : ""}`}
                  ref={(el) => (messageBubbleRefs.current[msg.message_id] = el)}
                >
                  <span className={styles.messageUsername}>
                    {msg.username || "Anonymous"}
                    {msg.message_type === "private" && (
                      <span className={styles.privateTag}> (Private)</span>
                    )}
                  </span>
                  {isDeleted ? (
                    <p className={styles.messageText}>
                      <FiTrash2 /> {msg.message_text}
                    </p>
                  ) : (
                    <>
                      {isImage && (
                        <img
                          src={msg.file_data}
                          alt={msg.file_name || "Sent image"}
                          className={styles.messageImage}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              "https://placehold.co/150x100/eeeeee/gray?text=Image+Error";
                          }}
                        />
                      )}
                      {!isImage &&
                        isFileMessage && ( // Generic file display
                          <div className={styles.messageFile}>
                            <a
                              href={msg.file_data}
                              download={msg.file_name}
                              className={styles.fileLink}
                            >
                              <FiDownload className={styles.fileIcon} />
                              <span>{msg.file_name}</span>
                            </a>
                          </div>
                        )}
                      {msg.message_text && (
                        <p className={styles.messageText}>{msg.message_text}</p>
                      )}
                    </>
                  )}

                  <time
                    className={styles.messageTimestamp}
                    dateTime={msg.created_at}
                  >
                    {formatTimestamp(msg.created_at)}
                    {msg.edited_at && (
                      <span className={styles.editedTag}> (edited)</span>
                    )}
                  </time>

                  {/* Reaction, Edit, Delete Buttons */}
                  {!isDeleted && (
                    <div className={styles.messageActions}>
                      {msg.message_id && (
                        <button
                          className={styles.reactButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReactionMenuForMessageId(
                              showReactionMenuForMessageId === msg.message_id
                                ? null
                                : msg.message_id
                            );
                            setShowFullReactionEmojiPicker(null);
                          }}
                          title="React to message"
                        >
                          +
                        </button>
                      )}

                      {isMyMessage &&
                        !isFileMessage && ( // Only allow editing own text messages
                          <button
                            className={styles.editButton}
                            onClick={() => startEditingMessage(msg)}
                            title="Edit message"
                            disabled={isBeingEdited}
                          >
                            <FiEdit />
                          </button>
                        )}

                      {isMyMessage && ( // Allow deleting own messages
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteMessage(msg.message_id)}
                          title="Delete message"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reaction Mini Menu */}
                  {showReactionMenuForMessageId === msg.message_id && (
                    <div className={styles.reactionMenu}>
                      {COMMON_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          className={styles.reactionMenuItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaction(msg.message_id, emoji);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        className={`${styles.reactionMenuItem} ${styles.moreEmojisButton}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openFullReactionPicker(msg.message_id, e);
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* Display reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={styles.reactionsContainer}>
                      {msg.reactions.map((reaction) => (
                        <span
                          key={reaction.emoji}
                          className={`${styles.reactionBubble} ${
                            reaction.userIds.includes(user?.userid)
                              ? styles.userReacted
                              : ""
                          }`}
                          onClick={() =>
                            handleReaction(msg.message_id, reaction.emoji)
                          }
                          title={`Reacted by: ${reaction.usernames.join(", ")}`}
                        >
                          <span className={styles.emoji}>{reaction.emoji}</span>
                          <span className={styles.count}>
                            {reaction.userIds.length}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
        {isTyping && (
          <div className={styles.typingIndicator}>Someone is typing...</div>
        )}
        <div ref={messagesEndRef} />
      </section>

      {/* Full Reaction Emoji Picker (conditionally rendered) */}
      {showFullReactionEmojiPicker && (
        <>
          <div
            className={styles.reactionEmojiPickerOverlay}
            onClick={() => setShowFullReactionEmojiPicker(null)}
          ></div>
          <div className={styles.reactionEmojiPicker}>
            <EmojiPicker
              onEmojiClick={(emojiObject) =>
                handleReaction(showFullReactionEmojiPicker, emojiObject.emoji)
              }
              theme="light"
              emojiStyle="native"
              width="100%"
              height="100%"
              searchDisabled={false}
              skinTonesDisabled={false}
            />
          </div>
        </>
      )}

      <form
        onSubmit={sendMessage}
        className={styles.inputForm}
        aria-label="Send a message"
      >
        {selectedFile && (
          <div className={styles.selectedFilePreview}>
            <div className={styles.fileIconWrapper}>
              {selectedFile.type.startsWith("image/") ? (
                <img
                  src={selectedFile.data}
                  alt="Selected file preview"
                  className={styles.previewThumbnail}
                />
              ) : (
                <FiDownload className={styles.fileTypeIcon} />
              )}
            </div>
            <span className={styles.fileNamePreview}>{selectedFile.name}</span>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className={styles.clearFileButton}
              title="Clear selected file"
            >
              <FiX />
            </button>
          </div>
        )}

        {editingMessageId && (
          <div className={styles.editingIndicator}>
            Editing message:{" "}
            <span className={styles.editingMessageTextPreview}>
              {editingMessageText.substring(0, 50)}
              {editingMessageText.length > 50 ? "..." : ""}
            </span>
            <button
              type="button"
              onClick={cancelEditing}
              className={styles.cancelEditButton}
            >
              <FiX /> Cancel
            </button>
          </div>
        )}

        <div className={styles.inputFieldWrapper}>
          <input
            type="file"
            accept="image/*, application/pdf, .doc, .docx, .xls, .xlsx, .txt" // Accept common image and document types
            ref={fileInputRef}
            onChange={handleFileSelect}
            className={styles.hiddenFileInput}
            aria-label="Select file to send"
          />
          <button
            type="button"
            onClick={triggerFileInput}
            className={styles.attachFileButton} // Renamed for clarity
            title="Attach File"
            disabled={editingMessageId !== null} // Disable file attach when editing
          >
            <FiImage className={styles.attachFileIcon} />{" "}
            {/* Using FiImage, but could be FiPaperclip */}
          </button>
          <button
            type="button"
            onClick={() => setShowInputEmojiPicker((prev) => !prev)}
            className={styles.emojiButton}
            title="Choose Emoji"
            aria-expanded={showInputEmojiPicker}
            aria-haspopup="dialog"
            ref={inputEmojiButtonRef}
          >
            <FiSmile className={styles.emojiIcon} />
          </button>

          <input
            type="text"
            value={editingMessageId ? editingMessageText : input}
            onChange={(e) =>
              editingMessageId
                ? setEditingMessageText(e.target.value)
                : handleInputChange(e)
            }
            placeholder={
              editingMessageId ? "Edit your message..." : "Type your message..."
            }
            className={styles.messageInput}
            disabled={!socket}
            aria-label="Message input"
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={
              (!input.trim() && !selectedFile && !editingMessageId) || !socket
            } // Disable if no text/file AND not editing, or not connected
            aria-label={
              editingMessageId ? "Save edited message" : "Send message"
            }
          >
            {editingMessageId ? (
              <FiEdit className={styles.sendIcon} />
            ) : (
              <FiSend className={styles.sendIcon} />
            )}
          </button>
        </div>

        {showInputEmojiPicker && (
          <div
            className={styles.emojiPickerContainer}
            ref={inputEmojiPickerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Emoji picker"
          >
            <EmojiPicker
              onEmojiClick={onInputEmojiClick}
              theme="light"
              emojiStyle="native"
              width="100%"
              height={300}
            />
          </div>
        )}
      </form>
    </div>

);
};

export default PublicChat;

import React, {
useState,
useEffect,
useRef,
useCallback,
useContext,
} from "react";
import { io } from "socket.io-client";
import styles from "./PublicChat.module.css"; // Make sure this path is correct
import { UserState } from "../../App.jsx"; // Import UserState from your App.jsx
import Message from "../../components/PublicChat/Message.jsx"; // Import the Message component
import EmojiPicker from "emoji-picker-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
faFileAlt,
faImage,
faPaperclip,
faSmile,
faPaperPlane,
faComments,
faUserSecret,
faUsers,
faSpinner,
faTimes,
faTimesCircle,
faTrashAlt,
faPencilAlt,
faDownload,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2"; // For confirmations/alerts

// Set up socket connection
const socket = io("http://localhost:5000"); // Your backend server URL

// Define the public chat room ID (should match backend)
const PUBLIC_CHAT_ROOM_ID = "stackoverflow_lobby";

function PublicChat() {
// Access user information from your UserState context
const { user } = useContext(UserState);

const [messages, setMessages] = useState([]);
const [messageInput, setMessageInput] = useState("");
const [isLoading, setIsLoading] = useState(true);
const [emptyChat, setEmptyChat] = useState(false);
const [onlineUsers, setOnlineUsers] = useState([]); // Only currently online users (from socket)
const [allUsers, setAllUsers] = useState([]); // All registered users (fetched via HTTP)
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const [isTyping, setIsTyping] = useState(false);
const [typingUsers, setTypingUsers] = useState({}); // {userId: username}
const [selectedFile, setSelectedFile] = useState(null);
const [previewUrl, setPreviewUrl] = useState(null);
const [fileType, setFileType] = useState(null);
const [editingMessage, setEditingMessage] = useState(null); // State to hold message being edited
const [showImageModal, setShowImageModal] = useState(false); // State for image modal
const [modalImageUrl, setModalImageUrl] = useState(""); // Image URL for modal
const [modalImageName, setModalImageName] = useState(""); // Image Name for modal
const [modalImageType, setModalImageType] = useState(""); // Image Type for modal

// NEW STATES for Private Chat
const [chatMode, setChatMode] = useState("public"); // 'public' or 'private'
const [selectedPrivateChatUser, setSelectedPrivateChatUser] = useState(null); // { userId, username, avatar_url }

const messagesEndRef = useRef(null); // Ref for scrolling to bottom
const fileInputRef = useRef(null); // Ref for file input
const isMounted = useRef(true); // To prevent state updates on unmounted component

// Scroll to the latest message
const scrollToBottom = useCallback(() => {
messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, []);

// Function to fetch chat history from the backend
const fetchChatHistory = useCallback(
async (currentMode, targetUser = null) => {
if (!user?.userid) {
setIsLoading(false);
setEmptyChat(true);
return; // Don't fetch if user isn't logged in
}

      setMessages([]); // Clear messages before loading new history
      setIsLoading(true);
      setEmptyChat(false);
      setTypingUsers({}); // Clear typing indicators

      let dataToSend = {
        userId: user.userid, // Always send current user's ID
        roomId: PUBLIC_CHAT_ROOM_ID, // Default to public room ID, will be overridden for private
      };

      if (currentMode === "private" && targetUser) {
        dataToSend.targetUserId = targetUser.userId;
      } else if (currentMode === "public") {
        dataToSend.targetUserId = null; // Ensure targetUserId is null for public
      }

      // Using .on instead of .once to ensure the listener is always active
      // when fetchChatHistory is called. The logic inside filters messages.
      const handleChatHistory = (history) => {
        if (!isMounted.current) return; // Prevent state update if component unmounted

        let filteredHistory = [];
        if (currentMode === "public") {
          filteredHistory = history.filter(
            (msg) =>
              msg.message_type === "public" &&
              msg.room_id === PUBLIC_CHAT_ROOM_ID
          );
        } else if (currentMode === "private" && targetUser) {
          filteredHistory = history.filter(
            (msg) =>
              msg.message_type === "private" &&
              ((msg.user_id === user.userid &&
                msg.recipient_id === targetUser.userId) ||
                (msg.user_id === targetUser.userId &&
                  msg.recipient_id === user.userid))
          );
        }
        setMessages(filteredHistory);
        setIsLoading(false);
        setEmptyChat(filteredHistory.length === 0);
        scrollToBottom();
        // Remove this specific listener after processing to avoid
        // potential double-handling if socket.once is used elsewhere.
        // However, for fetch_chat_history, it's generally fine to keep it .on
        // if the backend consistently emits only once per request.
        // If not, consider a more robust request-response pattern.
      };

      const handleError = (errorMessage) => {
        if (!isMounted.current) return;
        console.error("Error fetching chat history:", errorMessage);
        setIsLoading(false);
        setEmptyChat(true);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: `Failed to fetch chat history: ${errorMessage}`,
        });
      };

      socket.on("chat_history", handleChatHistory);
      socket.on("error", handleError); // Keep this general error handler

      socket.emit("fetch_chat_history", dataToSend);

      // Cleanup function for this specific fetch, if needed,
      // though general socket listeners are handled in the main useEffect.
      return () => {
        socket.off("chat_history", handleChatHistory);
        // Do NOT turn off the general 'error' listener here,
        // it's handled in the main useEffect cleanup.
      };
    },
    [user, scrollToBottom]

); // Added user to dependencies

// NEW: Function to fetch all registered users
const fetchAllUsers = useCallback(async () => {
try {
const token = localStorage.getItem("token");
const response = await fetch("http://localhost:5000/api/v1/user/", {
headers: {
Authorization: `Bearer ${token}`,
"Content-Type": "application/json",
},
});
if (response.ok) {
const data = await response.json();
setAllUsers(data.users);
} else {
console.error(
"Failed to fetch all users:",
response.status,
response.statusText
);
Swal.fire("Error", "Failed to load user list.", "error");
}
} catch (error) {
console.error("Error fetching all users:", error);
Swal.fire("Error", "Network error fetching user list.", "error");
}
}, []);

// Effect hook for socket event listeners and initial data fetch
useEffect(() => {
isMounted.current = true; // Set mounted flag

    if (!user || !socket) {
      // If user logs out, reset private chat state
      setSelectedPrivateChatUser(null);
      setChatMode("public");
      setMessages([]);
      setIsLoading(false);
      setEmptyChat(true);
      return;
    }

    // Inform backend that user is online
    socket.emit("user_online", {
      userId: user.userid,
      username: user.username,
      avatar_url: user.avatar_url,
    });

    // Initial fetch of chat history based on current mode
    if (chatMode === "public") {
      fetchChatHistory("public");
    } else if (chatMode === "private" && selectedPrivateChatUser) {
      fetchChatHistory("private", selectedPrivateChatUser);
    } else if (chatMode === "private" && !selectedPrivateChatUser) {
      // If in private mode but no user selected, display empty
      setIsLoading(false);
      setEmptyChat(true);
    }

    // Fetch all users when component mounts or user state changes
    fetchAllUsers();

    // Listen for incoming messages
    socket.on("message", (newMessage) => {
      setMessages((prevMessages) => {
        // Only add if it's relevant to the current chat mode and selected user
        if (
          chatMode === "public" &&
          newMessage.message_type === "public" &&
          newMessage.room_id === PUBLIC_CHAT_ROOM_ID
        ) {
          return [...prevMessages, newMessage];
        } else if (chatMode === "private" && selectedPrivateChatUser) {
          const isMyDm =
            newMessage.message_type === "private" &&
            newMessage.user_id === user.userid &&
            newMessage.recipient_id === selectedPrivateChatUser.userId;
          const isTheirDm =
            newMessage.message_type === "private" &&
            newMessage.user_id === selectedPrivateChatUser.userId &&
            newMessage.recipient_id === user.userid;
          if (isMyDm || isTheirDm) {
            return [...prevMessages, newMessage];
          }
        }
        return prevMessages; // If not relevant, don't update messages
      });
      scrollToBottom();
    });

    // Listen for message updates (edit, delete, reaction)
    socket.on("message_updated", (updatedMessage) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.message_id === updatedMessage.message_id ? updatedMessage : msg
        )
      );
      scrollToBottom();
    });

    // Listen for online users updates
    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    // Listen for typing indicators
    socket.on("typing", ({ userId, username, roomId }) => {
      // Determine if typing event is relevant to current view
      const isForCurrentPublicRoom =
        chatMode === "public" && roomId === PUBLIC_CHAT_ROOM_ID;
      const isForCurrentPrivateChat =
        chatMode === "private" &&
        selectedPrivateChatUser &&
        userId === selectedPrivateChatUser.userId &&
        roomId ===
          [user.userid, selectedPrivateChatUser.userId].sort().join("-");

      if (
        userId !== user.userid &&
        (isForCurrentPublicRoom || isForCurrentPrivateChat)
      ) {
        setTypingUsers((prev) => ({ ...prev, [userId]: username }));
      }
    });

    socket.on("stop_typing", ({ userId }) => {
      setTypingUsers((prev) => {
        const newTypingUsers = { ...prev };
        delete newTypingUsers[userId];
        return newTypingUsers;
      });
    });

    // Handle generic socket errors
    socket.on("error", (errorMessage) => {
      Swal.fire({
        icon: "error",
        title: "Chat Error",
        text: errorMessage,
      });
    });

    // Clean up socket listeners on component unmount
    return () => {
      isMounted.current = false; // Set unmounted flag
      socket.off("message");
      socket.off("message_updated");
      socket.off("online_users");
      socket.off("typing");
      socket.off("stop_typing");
      // socket.off("chat_history"); // Handled in fetchChatHistory cleanup now
      socket.off("error");
    };

}, [
user,
scrollToBottom,
chatMode,
selectedPrivateChatUser,
fetchChatHistory,
fetchAllUsers,
]);

// Effect to handle user logout
useEffect(() => {
if (!user) {
setSelectedPrivateChatUser(null);
setChatMode("public");
setMessages([]);
setIsLoading(false);
setEmptyChat(true);
// Clear typing indicators for logged-out user
socket.emit("stop_typing", {
userId: user?.userid, // Use optional chaining just in case
roomId: PUBLIC_CHAT_ROOM_ID, // Or any room user was in
});
setTypingUsers({});
}
}, [user]);

// Automatically scroll to bottom when messages update
useEffect(() => {
scrollToBottom();
}, [messages, scrollToBottom]);

// Handle message input change
const handleMessageInputChange = (e) => {
setMessageInput(e.target.value);

    if (!user) return;

    // Determine the current room ID for typing indicator
    const currentRoomId =
      chatMode === "public"
        ? PUBLIC_CHAT_ROOM_ID
        : selectedPrivateChatUser
        ? [user.userid, selectedPrivateChatUser.userId].sort().join("-")
        : null; // No room if private chat mode selected but no user

    if (currentRoomId) {
      if (e.target.value.trim().length > 0 && !isTyping) {
        socket.emit("typing", {
          userId: user.userid,
          username: user.username,
          roomId: currentRoomId,
        });
        setIsTyping(true);
      } else if (e.target.value.trim().length === 0 && isTyping) {
        socket.emit("stop_typing", {
          userId: user.userid,
          roomId: currentRoomId,
        });
        setIsTyping(false);
      }
    }

};

// Toggle emoji picker visibility
const toggleEmojiPicker = () => {
setShowEmojiPicker((prev) => !prev);
};

// Handle emoji selection
const onEmojiClick = (emojiObject) => {
setMessageInput((prev) => prev + emojiObject.emoji);
// You might want to keep the emoji picker open after selection,
// or close it based on user preference. Keeping it open for multi-emoji.
// setShowEmojiPicker(false);
};

// Handle sending message
const handleSendMessage = async (e) => {
e.preventDefault();
if (!messageInput.trim() && !selectedFile) return;
if (!user) {
Swal.fire({
icon: "warning",
title: "Login Required",
text: "Please log in to send messages.",
});
return;
}
if (chatMode === "private" && !selectedPrivateChatUser) {
Swal.fire({
icon: "warning",
title: "Select Recipient",
text: "Please select a user to start a private chat.",
});
return;
}

    const currentChatRoomId =
      chatMode === "public"
        ? PUBLIC_CHAT_ROOM_ID
        : selectedPrivateChatUser
        ? [user.userid, selectedPrivateChatUser.userId].sort().join("-")
        : null;

    // --- Start Optimistic UI Update ---
    const tempId = "temp-" + Date.now() + Math.random(); // Temporary unique ID for client-side
    const now = new Date();

    const baseMessageData = {
      roomId: currentChatRoomId,
      text: messageInput.trim(),
      userId: user.userid,
      username: user.username,
      avatar_url: user.avatar_url,
      message_type: chatMode,
      recipient_id:
        chatMode === "private" ? selectedPrivateChatUser.userId : null,
    };

    const tempMessage = {
      message_id: tempId, // Temporary ID
      user_id: user.userid,
      username: user.username,
      avatar_url: user.avatar_url,
      message_text: baseMessageData.text,
      room_id: baseMessageData.roomId,
      message_type: baseMessageData.message_type,
      recipient_id: baseMessageData.recipient_id,
      created_at: now.toISOString(), // Use client's current time for optimistic display
      edited_at: null,
      is_deleted: false,
      reactions: [],
      status: "sending", // Add a status flag
      file_data: null,
      file_name: null,
      file_type: null,
    };

    if (selectedFile) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = () => {
        tempMessage.file_data = reader.result;
        tempMessage.file_name = selectedFile.name;
        tempMessage.file_type = selectedFile.type;
        baseMessageData.file_data = reader.result;
        baseMessageData.file_name = selectedFile.name;
        baseMessageData.file_type = selectedFile.type;

        // Add the temporary message immediately to messages state
        setMessages((prev) => [...prev, tempMessage]);
        scrollToBottom();

        if (editingMessage) {
          // For editing, you'd find and replace the existing message directly
          // (More complex: you might want to send original messageId + new content to backend)
          socket.emit("edit_message", {
            messageId: editingMessage.message_id,
            newText: baseMessageData.text,
            userId: user.userid,
            file_data: baseMessageData.file_data,
            file_name: baseMessageData.file_name,
            file_type: baseMessageData.file_type,
          });
          setEditingMessage(null);
        } else {
          // Emit the message to the server for processing
          socket.emit("chat message", baseMessageData);
        }
        setMessageInput("");
        setSelectedFile(null);
        setPreviewUrl(null);
        setFileType(null);
        if (isTyping) {
          socket.emit("stop_typing", {
            userId: user.userid,
            roomId: currentChatRoomId,
          });
          setIsTyping(false);
        }
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        Swal.fire("Error", "Failed to read selected file.", "error");
      };
    } else {
      // Add the temporary message immediately to messages state
      setMessages((prev) => [...prev, tempMessage]);
      scrollToBottom();

      if (editingMessage) {
        socket.emit("edit_message", {
          messageId: editingMessage.message_id,
          newText: baseMessageData.text,
          userId: user.userid,
          file_data: null,
          file_name: null,
          file_type: null,
        });
        setEditingMessage(null);
      } else {
        // Emit the message to the server for processing
        socket.emit("chat message", baseMessageData);
      }
      setMessageInput("");
      if (isTyping) {
        socket.emit("stop_typing", {
          userId: user.userid,
          roomId: currentChatRoomId,
        });
        setIsTyping(false);
      }
    }

};

// --- Update socket.on('message', ...) to handle the confirmed message ---
socket.on("message", (confirmedMessage) => {
console.log("Received confirmed message from server:", confirmedMessage);
// Remove the temporary message and add the confirmed one
setMessages((prevMessages) => {
// Filter out the temporary message if it exists (by comparing text and sender, or if you can send tempId back)
// This is a simplified check. A more robust solution would involve the server returning the tempId.
const updatedMessages = prevMessages.filter(
(msg) =>
!(
msg.status === "sending" &&
msg.user_id === confirmedMessage.user_id &&
msg.message_text === confirmedMessage.message_text &&
msg.room_id === confirmedMessage.room_id
)
);

      // Ensure the confirmed message is not a duplicate before adding
      const isDuplicate = updatedMessages.some(
        (msg) => msg.message_id === confirmedMessage.message_id
      );
      if (!isDuplicate) {
        return [...updatedMessages, confirmedMessage];
      }
      return updatedMessages; // If it's a duplicate, just return current state
    });
    scrollToBottom();

});

// Handle keydown for sending message on Enter (and Shift+Enter for new line)
const handleKeyDown = (e) => {
if (e.key === "Enter" && !e.shiftKey) {
e.preventDefault();
handleSendMessage(e);
}
};

// Handle file selection
const handleFileChange = (e) => {
const file = e.target.files[0];
if (file) {
// Basic file size validation (e.g., 5MB)
const MAX*FILE_SIZE = 5 * 1024 \_ 1024; // 5 MB
if (file.size > MAX_FILE_SIZE) {
Swal.fire({
icon: "error",
title: "File Too Large",
text: "Please select a file smaller than 5MB.",
});
setSelectedFile(null);
setPreviewUrl(null);
setFileType(null);
if (fileInputRef.current) fileInputRef.current.value = "";
return;
}

      setSelectedFile(file);
      setFileType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }

};

// Clear selected file
const clearFileSelection = () => {
setSelectedFile(null);
setPreviewUrl(null);
setFileType(null);
if (fileInputRef.current) {
fileInputRef.current.value = "";
}
};

// Message Actions Handlers
const startEditingMessage = (message) => {
setEditingMessage(message);
setMessageInput(message.message_text);
if (message.file_data) {
// Re-creating a File object is not necessary for preview/sending
// just set the data and type directly from the message
setSelectedFile(
new File([], message.file_name || "edited_file", {
type: message.file_type || "application/octet-stream",
})
);
setPreviewUrl(message.file_data);
setFileType(message.file_type);
}
const inputElement = document.querySelector(`.${styles.messageInput}`);
if (inputElement) {
inputElement.focus();
}
};

const cancelEditing = () => {
setEditingMessage(null);
setMessageInput("");
clearFileSelection();
};

const confirmDeleteMessage = (messageId) => {
Swal.fire({
title: "Are you sure?",
text: "You will not be able to recover this message!",
icon: "warning",
showCancelButton: true,
confirmButtonColor: "#3085d6",
cancelButtonColor: "#d33",
confirmButtonText: "Yes, delete it!",
}).then((result) => {
if (result.isConfirmed) {
socket.emit("delete_message", {
messageId: messageId,
userId: user.userid,
});
}
});
};

const handleReaction = (messageId, emoji) => {
if (!user) {
Swal.fire({
icon: "warning",
title: "Login Required",
text: "Please log in to react to messages.",
});
return;
}
socket.emit("react_message", {
messageId,
userId: user.userid,
username: user.username,
emoji,
});
};

// Image Modal Handlers
const openImageModal = (imageUrl, imageName, imageType) => {
setModalImageUrl(imageUrl);
setModalImageName(imageName);
setModalImageType(imageType);
setShowImageModal(true);
};

const closeImageModal = () => {
setShowImageModal(false);
setModalImageUrl("");
setModalImageName("");
setModalImageType("");
};

const downloadImage = () => {
const link = document.createElement("a");
link.href = modalImageUrl;
link.download = modalImageName || "download";
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
};

// Chat Mode Change Handlers
const handleChatModeChange = (mode) => {
setChatMode(mode);
setEditingMessage(null);
setTypingUsers({});
setMessageInput("");
clearFileSelection();

    if (mode === "public") {
      setSelectedPrivateChatUser(null);
      fetchChatHistory("public");
    } else {
      setMessages([]); // Clear messages for private mode until a user is selected
      setEmptyChat(true);
      setIsLoading(false);
    }

};

const handlePrivateChatSelect = (targetUser) => {
if (!user) {
Swal.fire({
icon: "warning",
title: "Login Required",
text: "You must be logged in to start private chats.",
});
return;
}
// If selecting the currently selected user again, do nothing
if (
selectedPrivateChatUser &&
selectedPrivateChatUser.userId === targetUser.userId
) {
return;
}
setSelectedPrivateChatUser(targetUser);
setChatMode("private");
setEditingMessage(null);
setTypingUsers({});
setMessageInput("");
clearFileSelection();
fetchChatHistory("private", targetUser);
};

// Helper to check if a user is online
const isUserOnline = (userId) => {
return onlineUsers.some((onlineUser) => onlineUser.userId === userId);
};

// Render logic if user is not logged in
if (!user) {
return (

<div className={styles.publicChatContainer}>
<div className={styles.chatHeader}>
<h2 className={styles.chatTitle}>Public Chat Lobby</h2>
</div>
<div className={styles.messagesContainer}>
<p className={styles.emptyChat}>Please log in to join the chat.</p>
</div>
</div>
);
}

return (

<div className={styles.publicChatContainer}>
<div className={styles.chatHeader}>
<h2 className={styles.chatTitle}>
{chatMode === "public"
? "Evangadi Public Chat"
: selectedPrivateChatUser
? `DM with ${selectedPrivateChatUser.username}`
: "Select User for Private Chat"}
</h2>
<div className={styles.headerControls}>
<button
className={`${styles.chatModeButton} ${
              chatMode === "public" ? styles.activeMode : ""
            }`}
onClick={() => handleChatModeChange("public")}
title="Switch to Public Chat" >
<FontAwesomeIcon
              icon={faComments}
              className={styles.chatModeIcon}
            />{" "}
Public
</button>
<button
className={`${styles.chatModeButton} ${
              chatMode === "private" ? styles.activeMode : ""
            }`}
onClick={() => handleChatModeChange("private")}
title="Switch to Private Chat"
disabled={!user} >
<FontAwesomeIcon
              icon={faUserSecret}
              className={styles.chatModeIcon}
            />{" "}
Private
</button>

          <div className={styles.onlineUsersButtonWrapper}>
            <button className={styles.onlineUsersButton}>
              Online:{" "}
              {onlineUsers.filter((u) => u.userId !== user.userid).length}{" "}
              <FontAwesomeIcon icon={faUsers} />
            </button>
          </div>
        </div>
      </div>
      {/* Combined Chat Area and User Sidebar */}
      <div className={styles.chatAndSidebarWrapper}>
        {/* Main Chat Messages Area */}
        <div className={styles.mainChatArea}>
          {chatMode === "public" ||
          (chatMode === "private" && selectedPrivateChatUser) ? (
            <div className={`${styles.messagesContainer} scrollbar-thin`}>
              {isLoading ? (
                <div className={styles.loadingMessage}>
                  <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                  <p className={styles.loadingText}>Loading messages...</p>
                </div>
              ) : emptyChat ? (
                <p className={styles.emptyChat}>
                  {chatMode === "public"
                    ? "No messages in this public chat yet. Be the first to start a conversation!"
                    : `No private messages with ${
                        selectedPrivateChatUser?.username || "this user"
                      } yet. Start a conversation!`}
                </p>
              ) : (
                messages.map((msg) => (
                  <Message
                    key={msg.message_id}
                    message={msg}
                    user={user}
                    onEdit={startEditingMessage}
                    onDelete={confirmDeleteMessage}
                    onReact={handleReaction}
                    openImageModal={openImageModal}
                  />
                ))
              )}
              {Object.keys(typingUsers).length > 0 && (
                <div className={styles.typingIndicator}>
                  {Object.values(typingUsers).join(", ")} is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <p className={styles.emptyChat}>
              Please select a user from the 'All Users' list to start a private
              chat.
            </p>
          )}

          {/* Message Input Form */}
          {(chatMode === "public" || selectedPrivateChatUser) && (
            <form onSubmit={handleSendMessage} className={styles.inputForm}>
              {editingMessage && (
                <div className={styles.editingIndicator}>
                  <span>
                    Editing message:{" "}
                    <span className={styles.editingMessageTextPreview}>
                      {editingMessage.message_text.substring(0, 30)}
                      {editingMessage.message_text.length > 30 ? "..." : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className={styles.cancelEditButton}
                  >
                    <FontAwesomeIcon icon={faTimes} /> Cancel
                  </button>
                </div>
              )}
              {previewUrl && (
                <div className={styles.selectedFilePreview}>
                  {fileType && fileType.startsWith("image/") ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className={styles.previewThumbnail}
                    />
                  ) : (
                    <FontAwesomeIcon
                      icon={faFileAlt}
                      className={styles.fileTypeIcon}
                    />
                  )}
                  <span className={styles.fileNamePreview}>
                    {selectedFile?.name || "File"}
                  </span>
                  <button
                    type="button"
                    onClick={clearFileSelection}
                    className={styles.clearFileButton}
                  >
                    <FontAwesomeIcon icon={faTimesCircle} />
                  </button>
                </div>
              )}
              <div className={styles.inputFieldWrapper}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className={styles.hiddenFileInput}
                  accept="image/*,application/pdf,.doc,.docx,.txt"
                  disabled={
                    !user ||
                    (chatMode === "private" && !selectedPrivateChatUser)
                  }
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className={styles.attachFileButton}
                  disabled={
                    !user ||
                    (chatMode === "private" && !selectedPrivateChatUser)
                  }
                >
                  <FontAwesomeIcon
                    icon={faPaperclip}
                    className={styles.attachFileIcon}
                  />
                </button>
                <textarea
                  className={styles.messageInput}
                  placeholder={
                    chatMode === "public"
                      ? "Type a public message..."
                      : `Message ${selectedPrivateChatUser?.username || "..."}`
                  }
                  value={messageInput}
                  onChange={handleMessageInputChange}
                  onKeyDown={handleKeyDown}
                  rows="1"
                  disabled={
                    !user ||
                    (chatMode === "private" && !selectedPrivateChatUser)
                  }
                />
                <button
                  type="button"
                  onClick={toggleEmojiPicker}
                  className={styles.emojiButton}
                  disabled={
                    !user ||
                    (chatMode === "private" && !selectedPrivateChatUser)
                  }
                >
                  <FontAwesomeIcon
                    icon={faSmile}
                    className={styles.emojiIcon}
                  />
                </button>
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={
                    !user ||
                    (!messageInput.trim() && !selectedFile) ||
                    (chatMode === "private" && !selectedPrivateChatUser)
                  }
                >
                  Send <FontAwesomeIcon icon={faPaperPlane} />
                </button>
              </div>
              {showEmojiPicker && (
                <div className={styles.emojiPickerContainer}>
                  <EmojiPicker onEmojiClick={onEmojiClick} />
                </div>
              )}
            </form>
          )}
        </div>

        {/* All Users Sidebar - Always visible when in private chat mode (or can be toggled) */}
        {chatMode === "private" && (
          <div className={`${styles.onlineUsersSidebar} scrollbar-thin`}>
            <h3>All Users</h3>
            {allUsers.length > 0 ? (
              <ul className={styles.onlineUsersList}>
                {allUsers
                  .filter((u) => u.userid !== user.userid) // Exclude current user
                  .sort((a, b) => {
                    // Sort online users to the top
                    const aOnline = isUserOnline(a.userid);
                    const bOnline = isUserOnline(b.userid);
                    if (aOnline && !bOnline) return -1;
                    if (!aOnline && bOnline) return 1;
                    return a.username.localeCompare(b.username); // Alphabetical sort otherwise
                  })
                  .map((u) => (
                    <li
                      key={u.userid}
                      className={`${styles.onlineUserItem} ${
                        selectedPrivateChatUser?.userId === u.userid // Use userId for comparison
                          ? styles.selectedUser
                          : ""
                      }`}
                      onClick={() => handlePrivateChatSelect(u)}
                    >
                      <div
                        className={`${styles.onlineIndicator} ${
                          isUserOnline(u.userid)
                            ? styles.isOnline
                            : styles.isOffline
                        }`}
                      ></div>
                      <button className={styles.onlineUsernameButton}>
                        {u.username}
                      </button>
                      {u.avatar_url && (
                        <img
                          src={u.avatar_url}
                          alt={`${u.username}'s avatar`}
                          className={styles.onlineUserAvatar}
                        />
                      )}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className={styles.noOnlineUsers}>No other users registered.</p>
            )}
          </div>
        )}
      </div>{" "}
      {/* End chatAndSidebarWrapper */}
      {/* Image Modal */}
      {showImageModal && (
        <div className={styles.imageModalOverlay} onClick={closeImageModal}>
          <div
            className={styles.imageModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeModalButton}
              onClick={closeImageModal}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <img
              src={modalImageUrl}
              alt={modalImageName}
              className={styles.fullSizeImage}
            />
            <div className={styles.modalActions}>
              <span className={styles.modalImageName}>{modalImageName}</span>
              <button
                className={styles.downloadModalButton}
                onClick={downloadImage}
              >
                <FontAwesomeIcon icon={faDownload} /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

);
}

export default PublicChat;
