// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const app = express(); // Initialize Express application

const aiRoutes = require("./routes/aiRoutes");
const cors = require("cors"); // For Cross-Origin Resource Sharing

const port = process.env.PORT || 5000;

// Database connection
const dbConnection = require("./config/dbConfig");

// Test GET request for root path
app.get("/", (req, res) => {
  res.status(200).send("welcome-to Evangadi-");
});

// CORS middleware to allow requests from frontend origin
app.use(cors({ origin: "http://localhost:5173" }));

// Middleware to parse JSON request bodies
app.use(express.json());

// User authentication routes
const userRoutes = require("./routes/userRoutes");
app.use("/api/v1/user", userRoutes);

// AI-related routes
app.use("/api/ai", aiRoutes);

// Questions-related routes
const questionRoutes = require("./routes/questionRoute");
app.use("/api/v1", questionRoutes);

// Answers-related routes
const answerRoutes = require("./routes/answerRoute");
app.use("/api/v1", answerRoutes);

// Function to start the server and connect to the database
async function start() {
  try {
    // Test database connection
    await dbConnection.execute("select 'test'");
    console.log("db connected");

    // Start the Express server
    await app.listen(port);
    console.log(`server running and listening on port ${port}`);
  } catch (err) {
    // Log database connection or server start errors
    console.log(err.message);
  }
}

// Execute the start function
start();
