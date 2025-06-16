require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { StatusCodes } = require("http-status-codes");
const dbConnection = require("../config/dbConfig"); // Import your database connection

// Supported Gemini models
const SUPPORTED_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
  "gemini-1.0-ultra",
  // "gemini-1.0-nano" // (API use not typical)
];

// Use a currently supported model. You can switch as needed via .env
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const API_KEY = process.env.GEMINI_API_KEY;

// --- Backend Initialization Logs ---
console.log("Backend Init: MODEL_NAME set to:", MODEL_NAME);
if (!SUPPORTED_MODELS.includes(MODEL_NAME)) {
  console.warn(
    `Warning: MODEL_NAME "${MODEL_NAME}" is not in SUPPORTED_MODELS. Check for typos or update SUPPORTED_MODELS if new models are available.`
  );
}
console.log(
  "Backend Init: API_KEY present (first 5 chars):",
  API_KEY ? API_KEY.substring(0, 5) + "..." : "NOT SET"
);
// --- End Backend Initialization Logs ---

if (!API_KEY) {
  console.error(
    "GEMINI_API_KEY is not set in environment variables. Please check your .env file and server restart."
  );
  throw new Error("Missing GEMINI_API_KEY. Server cannot start without it.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function saveMessageToDb(sessionId, userid, role, content) {
  try {
    const actualuserid = userid === undefined ? null : userid;
    const [result] = await dbConnection.execute(
      `INSERT INTO chat_history (session_id, userid, role, content) VALUES (?, ?, ?, ?)`,
      [sessionId, actualuserid, role, content]
    );
    console.log(`Saved ${role} message to DB, ID: ${result.insertId}`);
  } catch (dbError) {
    console.error("Error saving message to database:", dbError);
  }
}

async function loadHistoryFromDb(sessionId) {
  try {
    const [rows] = await dbConnection.execute(
      `SELECT role, content FROM chat_history WHERE session_id = ? ORDER BY timestamp ASC`,
      [sessionId]
    );
    return rows.map((row) => ({
      role: row.role,
      parts: [{ text: row.content }],
    }));
  } catch (dbError) {
    console.error("Error loading chat history from database:", dbError);
    return [];
  }
}

async function chatWithAI(req, res) {
  const { message, sessionId, userid } = req.body;

  console.log("--- Chatbot Request Received ---");
  console.log("Session ID:", sessionId);
  console.log("User ID:", userid);
  console.log("Incoming Message:", message);

  if (!message) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Message is required." });
  }
  if (!sessionId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Session ID is required for chat memory." });
  }

  try {
    await saveMessageToDb(sessionId, userid, "user", message);

    const loadedHistory = await loadHistoryFromDb(sessionId);

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const chat = model.startChat({
      history: loadedHistory,
      generationConfig: {
        maxOutputTokens: 200,
      },
    });

    const result = await chat.sendMessage([{ text: message }]);
    const response = await result.response;
    const aiText = response.text();

    await saveMessageToDb(sessionId, userid, "model", aiText);

    console.log("AI Reply received successfully.");

    res.status(StatusCodes.OK).json({ reply: aiText });
  } catch (error) {
    console.error("Error communicating with Gemini API:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Failed to get response from AI. Please try again later.",
      error: error.message,
    });
  }
}

async function getChatHistory(req, res) {
  const { sessionId } = req.query;

  if (!sessionId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Session ID is required to fetch history." });
  }

  try {
    const [rows] = await dbConnection.execute(
      `SELECT role, content FROM chat_history WHERE session_id = ? ORDER BY timestamp ASC`,
      [sessionId]
    );
    const historyForFrontend = rows.map((row) => ({
      role: row.role,
      parts: row.content,
    }));
    res.status(StatusCodes.OK).json({ history: historyForFrontend });
  } catch (error) {
    console.error("Error fetching chat history from DB:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Failed to fetch chat history.",
      error: error.message,
    });
  }
}

async function getAllChatSessions(req, res) {
  try {
    let query = `
      SELECT
        session_id,
        MAX(timestamp) AS last_updated_at,
        SUBSTRING_INDEX(GROUP_CONCAT(CASE WHEN role = 'user' THEN content END ORDER BY timestamp ASC), ',', 1) AS first_user_message
      FROM chat_history
      GROUP BY session_id
      ORDER BY last_updated_at DESC
    `;
    let params = [];

    const [rows] = await dbConnection.execute(query, params);

    const sessions = rows.map((row) => ({
      id: row.session_id,
      name: row.first_user_message
        ? row.first_user_message.substring(0, 50) +
          (row.first_user_message.length > 50 ? "..." : "")
        : `Chat Session: ${row.session_id.substring(0, 8)}...`,
      last_updated: new Date(row.last_updated_at).toLocaleString(),
    }));

    res.status(StatusCodes.OK).json({ sessions });
  } catch (error) {
    console.error("Error fetching all chat sessions from DB:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Failed to fetch chat sessions.",
      error: error.message,
    });
  }
}

module.exports = { chatWithAI, getChatHistory, getAllChatSessions };
