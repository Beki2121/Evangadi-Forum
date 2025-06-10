require("dotenv").config(); // Load environment variables - make sure this is at the very top!
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { StatusCodes } = require("http-status-codes");

// Verify this line is correctly changed and saved
// Use a currently supported model. 'gemini-1.5-flash' is a good balance of speed and capability.
// If you need more advanced reasoning, try 'gemini-1.5-pro' (check availability for your API key).
const MODEL_NAME = "gemini-1.5-flash"; // <--- **UPDATED MODEL NAME**

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
  // It's good practice to prevent the server from starting if a crucial API key is missing
  // or at least throw an error that will be caught by the main server start function.
  throw new Error("Missing GEMINI_API_KEY. Server cannot start without it.");
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

    // History needs to be formatted for the Gemini API
    // The client sends [{ role: 'user', parts: '...' }, { role: 'model', parts: '...' }]
    // But the Gemini SDK expects history to be an array of objects like { role: 'user', parts: [{ text: '...' }] }
    // The client also sends `message` as a string, but the API expects it as `parts: [{ text: '...' }]`
    const formattedHistory = (history || []).map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    }));

    const chat = model.startChat({
      history: formattedHistory, // Pass the correctly formatted history
      generationConfig: {
        maxOutputTokens: 200,
      },
    });

    // The new message also needs to be sent in the correct format
    const result = await chat.sendMessage([{ text: message }]); // Send the new message as a parts array
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
