require("dotenv").config(); // Load environment variables - make sure this is at the very top!
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { StatusCodes } = require("http-status-codes");

// Verify this line is correctly changed and saved
const MODEL_NAME = "gemini-1.0-pro"; // Make sure it's "gemini-1.0-pro"

const API_KEY = process.env.GEMINI_API_KEY;

// --- NEW DEBUGGING LOGS ---
console.log("Backend Init: MODEL_NAME set to:", MODEL_NAME);
console.log(
  "Backend Init: API_KEY present (first 5 chars):",
  API_KEY ? API_KEY.substring(0, 5) + "..." : "NOT SET"
);
// --- END NEW DEBUGGING LOGS ---

if (!API_KEY) {
  console.error(
    "GEMINI_API_KEY is not set in environment variables. Please check your .env file and server restart."
  );
  // Exit or handle error appropriately if the key is missing
  // You might want to return an error here to prevent further execution if the key is vital
  // return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: "Server configuration error: AI API key missing." });
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function chatWithAI(req, res) {
  const { message, history } = req.body;

  // --- NEW DEBUGGING LOGS ---
  console.log("--- Chatbot Request Received ---");
  console.log("Using Model:", MODEL_NAME); // Confirm model name at call time
  console.log(
    "Using API Key:",
    API_KEY ? API_KEY.substring(0, 5) + "..." : "NOT SET"
  ); // Confirm API key at call time
  console.log("Incoming Message:", message);
  // --- END NEW DEBUGGING LOGS ---

  if (!message) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: "Message is required." });
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const chat = model.startChat({
      history: history || [],
      generationConfig: {
        maxOutputTokens: 200,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // --- NEW DEBUGGING LOGS ---
    console.log("AI Reply received successfully.");
    // --- END NEW DEBUGGING LOGS ---

    res.status(StatusCodes.OK).json({ reply: text });
  } catch (error) {
    console.error("Error communicating with Gemini API:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "Failed to get response from AI. Please try again later.",
      error: error.message,
    });
  }
}

module.exports = { chatWithAI };
