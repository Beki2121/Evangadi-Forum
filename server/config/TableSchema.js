// config/initDb.js
const db = require("./dbConfig");

async function initializeDatabase() {
  console.log("Attempting to initialize database tables...");
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        userid INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(20) NOT NULL,
        firstname VARCHAR(20) NOT NULL,
        lastname VARCHAR(20) NOT NULL,
        email VARCHAR(40) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Users table ensured.");

    await db.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        questionid VARCHAR(100) NOT NULL UNIQUE,
        userid INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        tag VARCHAR(20),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userid) REFERENCES users(userid) ON DELETE CASCADE
      );
    `);
    console.log("Questions table ensured.");

    await db.query(`
      CREATE TABLE IF NOT EXISTS answers (
        answerid INT AUTO_INCREMENT PRIMARY KEY,
        userid INT NOT NULL,
        questionid VARCHAR(100) NOT NULL,
        answer TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        rating_count INT DEFAULT 0,
        FOREIGN KEY(questionid) REFERENCES questions(questionid) ON DELETE CASCADE,
        FOREIGN KEY(userid) REFERENCES users(userid) ON DELETE CASCADE
      );
    `);
    console.log("Answers table ensured.");

    await db.query(`
      CREATE TABLE IF NOT EXISTS answer_ratings (
        ratingid INT AUTO_INCREMENT PRIMARY KEY,
        answerid INT NOT NULL,
        userid INT NOT NULL,
        vote_type TINYINT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (answerid, userid),
        FOREIGN KEY (answerid) REFERENCES answers(answerid) ON DELETE CASCADE,
        FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
      );
    `);
    console.log("Answer ratings table ensured.");

    // Chat history table for AI memory
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        user_id INT NULL,
        role ENUM('user', 'model') NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        -- FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE SET NULL
      );
    `);
    console.log("Chat history table ensured.");

    console.log("All database tables checked/created successfully.");
  } catch (err) {
    console.error("Error during database table initialization:", err);
    process.exit(1);
  }
}

module.exports = initializeDatabase;
