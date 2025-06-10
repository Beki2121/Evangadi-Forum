// config/initDb.js
const db = require("./dbConfig"); // Adjust path if necessary based on your folder structure

async function initializeDatabase() {
  console.log("Attempting to initialize database tables...");
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        userid INT AUTO_INCREMENT,
        username VARCHAR(20) NOT NULL,
        firstname VARCHAR(20) NOT NULL,
        lastname VARCHAR(20) NOT NULL,
        email VARCHAR(40) NOT NULL,
        password VARCHAR(100) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(userid)
      );
    `);
    console.log("Users table ensured.");

    await db.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT,
        questionid VARCHAR(100) NOT NULL UNIQUE,
        userid INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        tag VARCHAR(20),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(id),
        FOREIGN KEY(userid) REFERENCES users(userid)
      );
    `);
    console.log("Questions table ensured.");

    await db.query(`
      CREATE TABLE IF NOT EXISTS answers (
        answerid INT AUTO_INCREMENT,
        userid INT NOT NULL,
        questionid VARCHAR(100) NOT NULL,
        answer TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        rating_count INT DEFAULT 0,
        PRIMARY KEY(answerid),
        FOREIGN KEY(questionid) REFERENCES questions(questionid),
        FOREIGN KEY(userid) REFERENCES users(userid)
      );
    `);
    console.log("Answers table ensured.");

    await db.query(`
      CREATE TABLE IF NOT EXISTS answer_ratings (
        ratingid INT AUTO_INCREMENT,
        answerid INT NOT NULL,
        userid INT NOT NULL,
        vote_type TINYINT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (ratingid),
        UNIQUE KEY (answerid, userid),
        FOREIGN KEY (answerid) REFERENCES answers(answerid) ON DELETE CASCADE,
        FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
      );
    `);
    console.log("Answer ratings table ensured.");

    console.log("All database tables checked/created successfully.");
  } catch (err) {
    console.error("Error during database table initialization:", err);
    // You might want to exit the process if table creation is critical
    process.exit(1);
  }
}

module.exports = initializeDatabase;
