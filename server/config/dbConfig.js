const mysql2 = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const dbConnection = mysql2.createPool({
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  connectionLimit: process.env.CONNECTION_LIMIT,
  host: process.env.DB_HOST,
});
// Create a promise-based connection pool
dbConnection.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    console.log("Database connected successfully");
    connection.release(); // Release the connection back to the pool
  }
});

module.exports = dbConnection.promise();
