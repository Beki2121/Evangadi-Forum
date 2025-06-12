// config/TableSchema.js
const dbConnection = require("./dbConfig");

async function initializeDatabase() {
  console.log("Attempting to initialize database tables...");

  try {
    // Create users table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS users (
        userid INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(20) NOT NULL UNIQUE,
        firstname VARCHAR(20) NOT NULL,
        lastname VARCHAR(20) NOT NULL,
        email VARCHAR(40) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        avatar_url VARCHAR(2048) DEFAULT NULL, -- NEW: Added avatar_url column
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Users table ensured.");

    // Create questions table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        questionid VARCHAR(100) NOT NULL UNIQUE,
        userid INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        tag VARCHAR(20),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userid) REFERENCES users(userid) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Questions table ensured.");

    // Create answers table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS answers (
        answerid INT AUTO_INCREMENT PRIMARY KEY,
        userid INT NOT NULL,
        questionid VARCHAR(100) NOT NULL,
        answer TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        rating_count INT DEFAULT 0,
        FOREIGN KEY(questionid) REFERENCES questions(questionid) ON DELETE CASCADE,
        FOREIGN KEY(userid) REFERENCES users(userid) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Answers table ensured.");

    // Create answer_ratings table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS answer_ratings (
        ratingid INT AUTO_INCREMENT PRIMARY KEY,
        answerid INT NOT NULL,
        userid INT NOT NULL,
        vote_type TINYINT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (answerid, userid),
        FOREIGN KEY (answerid) REFERENCES answers(answerid) ON DELETE CASCADE,
        FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Answer ratings table ensured.");

    // Create chat_history table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        user_id INT NULL,
        role ENUM('user', 'model') NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Chat history table ensured.");

    // Create chat_messages table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        message_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        username VARCHAR(255) NOT NULL,
        message_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        room_id VARCHAR(255) NOT NULL,
        message_type ENUM('public', 'private', 'file') NOT NULL DEFAULT 'public',
        recipient_id INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        edited_at DATETIME NULL,
        is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
        reactions JSON,
        file_data LONGTEXT NULL, -- Changed from LONGBLOB to LONGTEXT to align with your provided schema
        file_name VARCHAR(255) NULL,
        file_type VARCHAR(50) NULL,
        FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE SET NULL,
        FOREIGN KEY (recipient_id) REFERENCES users(userid) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Public Chat Messages table ensured.");

    // --- Conditional ALTER TABLE statements for existing databases ---

    // Check and add 'avatar_url' column to 'users' table if it doesn't exist
    const [avatarColumnExistsResult] = await dbConnection.query(`
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = 'users'
      AND column_name = 'avatar_url';
    `);

    if (avatarColumnExistsResult[0].count === 0) {
      await dbConnection.query(`
        ALTER TABLE users
        ADD COLUMN avatar_url VARCHAR(2048) DEFAULT NULL;
      `);
      console.log("Added 'avatar_url' column to 'users' table.");
    } else {
      console.log("'avatar_url' column already exists in 'users' table.");
    }

    // Check and add 'reactions' column to 'chat_messages' table if it doesn't exist
    const [reactionsColumnExistsResult] = await dbConnection.query(`
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = 'chat_messages'
      AND column_name = 'reactions';
    `);

    if (reactionsColumnExistsResult[0].count === 0) {
      await dbConnection.query(`
        ALTER TABLE chat_messages
        ADD COLUMN reactions JSON; -- DEFAULT '[]' might cause issue for older MySQL JSON type; manage default in application
      `);
      console.log("Added 'reactions' column to 'chat_messages' table.");
    } else {
      console.log(
        "'reactions' column already exists in 'chat_messages' table."
      );
    }

    // Ensure 'file_data', 'file_name', 'file_type' in chat_messages
    const fileDataColumnExistsResult = await dbConnection.query(`
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = 'chat_messages'
      AND column_name = 'file_data';
    `);
    if (fileDataColumnExistsResult[0][0].count === 0) {
      await dbConnection.query(
        `ALTER TABLE chat_messages ADD COLUMN file_data LONGTEXT NULL;`
      );
      console.log("Added 'file_data' column to 'chat_messages' table.");
    }

    const fileNameColumnExistsResult = await dbConnection.query(`
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = 'chat_messages'
      AND column_name = 'file_name';
    `);
    if (fileNameColumnExistsResult[0][0].count === 0) {
      await dbConnection.query(
        `ALTER TABLE chat_messages ADD COLUMN file_name VARCHAR(255) NULL;`
      );
      console.log("Added 'file_name' column to 'chat_messages' table.");
    }

    const fileTypeColumnExistsResult = await dbConnection.query(`
      SELECT COUNT(*) AS count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = 'chat_messages'
      AND column_name = 'file_type';
    `);
    if (fileTypeColumnExistsResult[0][0].count === 0) {
      await dbConnection.query(
        `ALTER TABLE chat_messages ADD COLUMN file_type VARCHAR(50) NULL;`
      );
      console.log("Added 'file_type' column to 'chat_messages' table.");
    }

    console.log("✅ All database tables checked/created successfully.");
  } catch (err) {
    console.error("❌ Error during database table initialization:", err);
    process.exit(1);
  }
}

module.exports = initializeDatabase;
