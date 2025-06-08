import React, { useState, useRef, useEffect } from "react";
import axios from "axios"; // Assuming you use axios
import styles from "./Chatbot.module.css"; // Create this CSS module

const Chatbot = () => {
  const [messages, setMessages] = useState([]); // Stores [{ role: 'user', parts: '...' }, { role: 'model', parts: '...' }]
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const API_URL = "http://localhost:5000/api/ai/chat"; 

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", parts: input.trim() };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Prepare history for conversational context
      // Gemini's history format expects objects with 'role' and 'parts'
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.parts }], // Gemini expects text in parts array
      }));

      const response = await axios.post(API_URL, {
        message: userMessage.parts, // Send only the new user message content
        history: conversationHistory, // Send the full history
      });

      const aiReply = { role: "model", parts: response.data.reply };
      setMessages((prevMessages) => [...prevMessages, aiReply]);
    } catch (error) {
      console.error("Error sending message to AI:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "model",
          parts: "Error: Could not get a response. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.chatbotContainer}>
      <div className={styles.messagesContainer}>
        {messages.length === 0 && (
          <div className={styles.welcomeMessage}>
            Hi there! How can I help you today?
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`${styles.message} ${
              msg.role === "user" ? styles.userMessage : styles.aiMessage
            }`}
          >
            {msg.parts}
          </div>
        ))}
        {loading && <div className={styles.loadingMessage}>Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className={styles.inputContainer}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className={styles.inputField}
          disabled={loading}
        />
        <button type="submit" className={styles.sendButton} disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chatbot;
