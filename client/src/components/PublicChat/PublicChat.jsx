import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from "react";
import { io } from "socket.io-client";
import styles from "./PublicChat.module.css"; // Ensure this path is correct
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

      // Use `socket.on` for `chat_history` and `error` within this useCallback
      // to ensure they are set up correctly each time `fetchChatHistory` is called.
      // This also ensures that the `user` and `targetUser` in scope are correct.
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
      socket.on("error", handleError);

      socket.emit("fetch_chat_history", dataToSend);

      // Cleanup for this specific `fetchChatHistory` call's listeners
      // to prevent multiple listeners accumulating if `fetchChatHistory`
      // is called frequently without the component remounting.
      return () => {
        socket.off("chat_history", handleChatHistory);
        socket.off("error", handleError); // Only if this error handler is specific to this fetch,
        // otherwise keep a global one in the main useEffect.
      };
    },
    [user, scrollToBottom]
  ); // Added user to dependencies

  // Function to fetch all registered users
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

  // Main Effect hook for socket event listeners and initial data fetch
  useEffect(() => {
    isMounted.current = true; // Set mounted flag on mount

    // If user logs out, reset all relevant states
    if (!user) {
      setSelectedPrivateChatUser(null);
      setChatMode("public");
      setMessages([]);
      setIsLoading(false);
      setEmptyChat(true);
      setTypingUsers({});
      // Optional: Emit stop_typing for the logged-out user if their ID is known
      socket.emit("stop_typing", {
        userId: user?.userid,
        roomId: PUBLIC_CHAT_ROOM_ID,
      });
      return () => {
        isMounted.current = false; // Cleanup on unmount
      }; // Early exit if no user
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
      setIsLoading(false);
      setEmptyChat(true);
    }

    // Fetch all users when component mounts or user state changes
    fetchAllUsers();

    // Socket listeners
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

    socket.on("message_updated", (updatedMessage) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.message_id === updatedMessage.message_id ? updatedMessage : msg
        )
      );
      scrollToBottom();
    });

    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("typing", ({ userId, username, roomId }) => {
      const isForCurrentPublicRoom =
        chatMode === "public" && roomId === PUBLIC_CHAT_ROOM_ID;
      const privateRoomId = selectedPrivateChatUser
        ? [user.userid, selectedPrivateChatUser.userId].sort().join("-")
        : null;
      const isForCurrentPrivateChat =
        chatMode === "private" &&
        selectedPrivateChatUser &&
        userId === selectedPrivateChatUser.userId &&
        roomId === privateRoomId;

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

    // General error handler for socket events, not specific to fetch history
    socket.on("error", (errorMessage) => {
      Swal.fire({
        icon: "error",
        title: "Chat Error",
        text: errorMessage,
      });
    });

    // Cleanup function for main useEffect
    return () => {
      isMounted.current = false; // Set unmounted flag
      socket.off("message");
      socket.off("message_updated");
      socket.off("online_users");
      socket.off("typing");
      socket.off("stop_typing");
      // `fetchChatHistory` has its own cleanup for 'chat_history' and 'error'
      // if those listeners are specifically managed within that useCallback.
      // If not, they would need to be off'ed here as well.
      // Based on my change to use `socket.on` with explicit `off` in `fetchChatHistory`'s return,
      // this general cleanup is fine.
    };
  }, [
    user,
    scrollToBottom,
    chatMode,
    selectedPrivateChatUser,
    fetchChatHistory,
    fetchAllUsers,
  ]);

  // Automatically scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle message input change
  const handleMessageInputChange = (e) => {
    setMessageInput(e.target.value);

    if (!user) return;

    const currentRoomId =
      chatMode === "public"
        ? PUBLIC_CHAT_ROOM_ID
        : selectedPrivateChatUser
        ? [user.userid, selectedPrivateChatUser.userId].sort().join("-")
        : null;

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

    if (!messageInput.trim() && !selectedFile) {
      return;
    }

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
        : PUBLIC_CHAT_ROOM_ID; // Fallback to public if no private user, though guarded by checks

    const messagePayload = {
      message_id: editingMessage ? editingMessage.message_id : Date.now(), // Use existing ID for edit, or a temporary one for new
      room_id: currentChatRoomId,
      message_text: messageInput.trim(),
      user_id: user.userid,
      username: user.username,
      avatar_url: user.avatar_url,
      timestamp: new Date().toISOString(), // Client-side timestamp
      message_type: chatMode,
      recipient_id:
        chatMode === "private" ? selectedPrivateChatUser.userId : null,
      file_data: null,
      file_name: null,
      file_type: null,
      // Add a temporary `status` or `isSending` flag if you want to show a sending indicator
      isSending: true,
    };

    // Optimistically add the message to the state
    if (editingMessage) {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.message_id === editingMessage.message_id
            ? {
                ...msg,
                message_text: messagePayload.message_text,
                isSending: true,
              } // Update text and add sending status
            : msg
        )
      );
    } else {
      setMessages((prevMessages) => [...prevMessages, messagePayload]);
    }
    setEmptyChat(false); // If sending a message, chat is no longer empty
    scrollToBottom();

    // If there's a file selected, convert it to Base64
    if (selectedFile) {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = () => {
        messagePayload.file_data = reader.result; // Base64 string
        messagePayload.file_name = selectedFile.name;
        messagePayload.file_type = selectedFile.type;

        // Update the optimistically added message with file data
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.message_id === messagePayload.message_id
              ? {
                  ...msg,
                  file_data: messagePayload.file_data,
                  file_name: messagePayload.file_name,
                  file_type: messagePayload.file_type,
                }
              : msg
          )
        );

        // Emit message after file is processed
        if (editingMessage) {
          socket.emit("edit_message", {
            messageId: messagePayload.message_id,
            newText: messagePayload.message_text,
            userId: user.userid,
            file_data: messagePayload.file_data,
            file_name: messagePayload.file_name,
            file_type: messagePayload.file_type,
          });
          setEditingMessage(null);
        } else {
          socket.emit("chat message", messagePayload);
        }

        // Clear input and file states
        setMessageInput("");
        setSelectedFile(null);
        setPreviewUrl(null);
        setFileType(null);

        // Stop typing indicator
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
        // Rollback the optimistically added message or mark it as failed
        setMessages((prevMessages) =>
          prevMessages.filter(
            (msg) => msg.message_id !== messagePayload.message_id
          )
        );
      };
    } else {
      // If no file selected, send text message directly
      if (editingMessage) {
        socket.emit("edit_message", {
          messageId: messagePayload.message_id,
          newText: messagePayload.message_text,
          userId: user.userid,
          // When editing, if no new file is selected, explicitly send null for file fields
          // to ensure previous file data is cleared if message was text-only or new text replaces file.
          file_data: null,
          file_name: null,
          file_type: null,
        });
        setEditingMessage(null);
      } else {
        socket.emit("chat message", messagePayload);
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
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
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
      // For editing, we just use the existing data if present
      setSelectedFile(
        new File([], message.file_name || "edited_file", {
          type: message.file_type || "application/octet-stream",
        })
      ); // Create a dummy File object for consistency with `selectedFile` state
      setPreviewUrl(message.file_data);
      setFileType(message.file_type);
    } else {
      // If message had no file, clear file selection in editor
      clearFileSelection();
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
      setEmptyChat(true); // Indicate chat is empty in private mode until user selected
      setIsLoading(false); // No loading if no user selected
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
      selectedPrivateChatUser.userId === targetUser.userId // Use userId for comparison
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

  // Render logic if user is not logged in (basic splash screen)
  if (!user) {
    return (
      <div className={styles.publicChatContainer}>
        <div className={styles.chatHeader}>
          <h2 className={styles.chatTitle}>Public Chat Lobby</h2>
          <div className={styles.headerControls}>
            <p style={{ color: "white", fontSize: "0.9rem", margin: 0 }}>
              Please log in to join the conversation.
            </p>
          </div>
        </div>
        <div className={styles.messagesContainer}>
          <p className={styles.emptyChat}>
            You need to be logged in to view messages and participate.
          </p>
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
            title="Switch to Public Chat"
          >
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
            disabled={!user}
          >
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
                        selectedPrivateChatUser?.userId === u.userid
                          ? styles.selectedUser
                          : ""
                      }`}
                      onClick={() =>
                        handlePrivateChatSelect({
                          userId: u.userid,
                          username: u.username,
                          avatar_url: u.avatar_url,
                        })
                      }
                    >
                      <img
                        src={
                          u.avatar_url ||
                          `https://ui-avatars.com/api/?name=${u.username}&background=random&color=fff`
                        }
                        alt={u.username}
                        className={styles.userAvatar}
                      />
                      <span className={styles.usernameText}>{u.username}</span>
                      {isUserOnline(u.userid) && (
                        <span className={styles.onlineDot} title="Online" />
                      )}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className={styles.emptyList}>No other users found.</p>
            )}
          </div>
        )}
      </div>

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
              className={styles.modalImage}
            />
            <div className={styles.modalImageInfo}>
              <p>{modalImageName}</p>
              <button
                onClick={downloadImage}
                className={styles.downloadImageButton}
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
