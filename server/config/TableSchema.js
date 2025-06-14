// config/TableSchema.js
const dbConnection = require("./dbConfig");

async function initializeDatabase() {
  console.log("Attempting to initialize database tables...");

  try {
    // Create users table (initial creation or ensure existence)
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS users (
        userid INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(20) NOT NULL UNIQUE,
        firstname VARCHAR(20) NOT NULL,
        lastname VARCHAR(20) NOT NULL,
        email VARCHAR(40) NOT NULL UNIQUE,
        password VARCHAR(100) NOT NULL,
        avatar_url VARCHAR(2048) DEFAULT NULL,
        is_verified BOOLEAN DEFAULT FALSE,         
        verification_token VARCHAR(255) UNIQUE,    
        token_expires_at DATETIME,                
        reset_password_token VARCHAR(255) UNIQUE,  
        reset_password_expires DATETIME,          
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

    // Create chat_history table (for AI chat, not the live chat)
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

    // Create chat_messages table (for live chat)
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        message_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        username VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(2048) DEFAULT NULL, -- Added avatar_url here for consistency
        message_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, -- Made nullable for file/audio only messages
        room_id VARCHAR(255) NOT NULL,
        message_type ENUM('public', 'private') NOT NULL DEFAULT 'public',
        recipient_id INT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        edited_at DATETIME NULL,
        is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
        reactions JSON NULL, -- Made nullable as it can be empty JSON or null
        file_data LONGTEXT NULL,
        file_name VARCHAR(255) NULL,
        file_type VARCHAR(50) NULL,
        audio_data LONGTEXT NULL,    -- NEW: Column for Base64 audio data
        audio_type VARCHAR(50) NULL, -- NEW: Column for audio MIME type
        audio_duration INTEGER NULL, -- NEW: Column for audio duration in seconds
        FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE SET NULL,
        FOREIGN KEY (recipient_id) REFERENCES users(userid) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Chat Messages table ensured.");

    // --- Conditional ALTER TABLE statements for existing databases ---

    // Helper function to check and add column if it doesn't exist
    const addColumnIfNotExists = async (
      tableName,
      columnName,
      columnDefinition
    ) => {
      try {
        const [columnExistsResult] = await dbConnection.query(
          `
          SELECT COUNT(*) AS count
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
          AND table_name = ?
          AND column_name = ?;
        `,
          [tableName, columnName]
        );

        if (columnExistsResult[0].count === 0) {
          await dbConnection.query(`
            ALTER TABLE ${tableName}
            ADD COLUMN ${columnName} ${columnDefinition};
          `);
          console.log(`Added '${columnName}' column to '${tableName}' table.`);
        } else {
          console.log(
            `'${columnName}' column already exists in '${tableName}' table.`
          );
        }
      } catch (error) {
        console.error(
          `Error checking/adding column ${columnName} to ${tableName}:`,
          error
        );
        // Do not exit process, just log error, as this is a migration helper
      }
    };

    // Users table new columns and existing checks (using helper)
    await addColumnIfNotExists("users", "is_verified", "BOOLEAN DEFAULT FALSE");
    await addColumnIfNotExists(
      "users",
      "verification_token",
      "VARCHAR(255) UNIQUE"
    );
    await addColumnIfNotExists("users", "token_expires_at", "DATETIME");
    await addColumnIfNotExists(
      "users",
      "reset_password_token",
      "VARCHAR(255) UNIQUE"
    );
    await addColumnIfNotExists("users", "reset_password_expires", "DATETIME");
    await addColumnIfNotExists(
      "users",
      "avatar_url",
      "VARCHAR(2048) DEFAULT NULL"
    ); // Ensure avatar_url exists

    // chat_messages table new columns and existing checks (using helper)
    await addColumnIfNotExists(
      "chat_messages",
      "avatar_url",
      "VARCHAR(2048) DEFAULT NULL"
    ); // Ensure avatar_url exists in chat_messages
    await addColumnIfNotExists(
      "chat_messages",
      "message_text",
      "TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL"
    ); // Ensure nullable
    await addColumnIfNotExists("chat_messages", "reactions", "JSON NULL"); // Ensure nullable JSON
    await addColumnIfNotExists("chat_messages", "file_data", "LONGTEXT NULL");
    await addColumnIfNotExists(
      "chat_messages",
      "file_name",
      "VARCHAR(255) NULL"
    );
    await addColumnIfNotExists(
      "chat_messages",
      "file_type",
      "VARCHAR(50) NULL"
    );

    // NEW: Add voice message columns to chat_messages
    await addColumnIfNotExists("chat_messages", "audio_data", "LONGTEXT NULL");
    await addColumnIfNotExists(
      "chat_messages",
      "audio_type",
      "VARCHAR(50) NULL"
    );
    await addColumnIfNotExists(
      "chat_messages",
      "audio_duration",
      "INTEGER NULL"
    );

    console.log(
      "✅ All database tables and columns checked/created/updated successfully."
    );
  } catch (err) {
    console.error("❌ Error during database table initialization:", err);
    process.exit(1); // Exit if critical database initialization fails
  }
}

module.exports = initializeDatabase;
