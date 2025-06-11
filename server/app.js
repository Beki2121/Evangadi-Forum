require("dotenv").config();
const express = require("express");
const app = express(); // Initialize Express application
const cors = require("cors"); // For Cross-Origin Resource Sharing
const port = process.env.PORT || 5000;
// Database connection
const dbConnection = require("./config/dbConfig");
const initializeDatabase = require("./config/TableSchema");
// Test GET request for root path
app.get("/", (req, res) => {
  res
    .status(200)
    .send(
      "welcome-to Evangadi-Forum \n The backend service is started successfully"
    );
});
// CORS middleware to allow requests from frontend origin
// app.use(cors({ origin: "http://localhost:5173" }));
app.use(cors());
// Middleware to parse JSON request bodies
app.use(express.json());
// User authentication routes
const userRoutes = require("./routes/userRoutes");
app.use("/api/v1/user", userRoutes);
// AI-related routes
const aiRoutes = require("./routes/aiRoutes");
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
    console.log("DB connected.");

    // Initialize database tables (create if not exists)
    // Make sure initializeDatabase is actually a function being exported from TableSchema.js
    await initializeDatabase();
    console.log("Database tables are ready.");

    // Start the Express server
    await app.listen(port);
    console.log(`Server running and listening on port ${port}`);
  } catch (err) {
    // Log database connection or server start errors
    console.error("Failed to start server or connect to DB:", err.message);
    // Consider exiting the process if the DB or table setup is critical
    process.exit(1);
  }
}

// Execute the start function
start();
