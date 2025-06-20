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

    // Create answers table (must be created before questions due to FK dependency)
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS answers (
        answerid INT AUTO_INCREMENT PRIMARY KEY,
        userid INT NOT NULL,
        questionid VARCHAR(100) NOT NULL,
        answer TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        rating_count INT DEFAULT 0,
        upvote_count INT DEFAULT 0,
        downvote_count INT DEFAULT 0,
        -- FOREIGN KEY(questionid) REFERENCES questions(questionid) ON DELETE CASCADE -- This FK will be added later or carefully managed if questions table is created first
        FOREIGN KEY(userid) REFERENCES users(userid) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Answers table ensured.");

    // Create questions table
    // Added solution_answer_id to link to the accepted answer
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        questionid VARCHAR(100) NOT NULL UNIQUE,
        userid INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        tag VARCHAR(20),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        solution_answer_id INT NULL, -- NEW: To store the ID of the accepted answer
        FOREIGN KEY(userid) REFERENCES users(userid) ON DELETE CASCADE,
        -- The FK to answers(answerid) is conditionally added by addColumnIfNotExists for existing tables
        -- or handled by the ALTER TABLE after table creation for new setups.
        -- For a clean initial setup, it's best to create 'answers' first, then 'questions' with this FK
        FOREIGN KEY(solution_answer_id) REFERENCES answers(answerid) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Questions table ensured.");

    // Create answer_ratings table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS answer_ratings (
        ratingid INT AUTO_INCREMENT PRIMARY KEY,
        answerid INT NOT NULL,
        userid INT NOT NULL,
        vote_type TINYINT NOT NULL, -- 1 for upvote, -1 for downvote
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (answerid, userid), -- Ensures one vote per user per answer
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
        userid INT NULL, -- Changed from userid to userid for consistency
        role ENUM('user', 'model') NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE SET NULL -- Changed from userid to userid
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Chat history table ensured.");

    // Create chat_messages table (for live chat)
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        message_id INT AUTO_INCREMENT PRIMARY KEY,
        userid INT NULL, -- NULL if message from a guest or deleted user
        username VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(2048) DEFAULT NULL,
        message_text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL, -- Nullable for file/audio only messages
        room_id VARCHAR(255) NOT NULL,
        message_type ENUM('public', 'private') NOT NULL DEFAULT 'public',
        recipient_id INT NULL, -- For private messages
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        edited_at DATETIME NULL,
        is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
        reactions JSON NULL, -- Stores JSON object of reactions (e.g., {"😊": ["user1_id", "user2_id"]})
        file_data LONGTEXT NULL, -- Base64 encoded file content
        file_name VARCHAR(255) NULL,
        file_type VARCHAR(50) NULL, -- MIME type of the file
        audio_data LONGTEXT NULL,    -- Base64 encoded audio data
        audio_type VARCHAR(50) NULL, -- MIME type of the audio
        audio_duration INTEGER NULL, -- Duration of the audio in seconds
        FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE SET NULL,
        FOREIGN KEY (recipient_id) REFERENCES users(userid) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log("Chat Messages table ensured.");

    // --- Conditional ALTER TABLE statements for existing databases ---

    // Helper function to check and add column if it doesn't exist
    const addColumnIfNotExists = async (
      tableName,
      columnName,
      columnDefinition,
      foreignKeyConstraint = null
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
          if (foreignKeyConstraint) {
            // Check if foreign key constraint already exists to avoid errors on re-run
            // MySQL 8.0.13+ supports IF NOT EXISTS for ADD CONSTRAINT
            // For broader compatibility, manually check information_schema
            const [fkExistsResult] = await dbConnection.query(
              `
              SELECT COUNT(*) AS count
              FROM information_schema.table_constraints
              WHERE constraint_schema = DATABASE()
              AND table_name = ?
              AND constraint_type = 'FOREIGN KEY'
              AND constraint_name = ?; -- Use a consistent name for the FK
            `,
              [tableName, `fk_${tableName}_${columnName}`]
            );
            if (fkExistsResult[0].count === 0) {
              await dbConnection.query(`
                ALTER TABLE ${tableName}
                ADD CONSTRAINT fk_${tableName}_${columnName} ${foreignKeyConstraint};
              `);
              console.log(
                `Added foreign key constraint for '${columnName}' to '${tableName}' table.`
              );
            } else {
              console.log(
                `Foreign key constraint for '${columnName}' already exists in '${tableName}' table.`
              );
            }
          }
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
    );

    // Answers table new columns for separate vote counts
    await addColumnIfNotExists("answers", "upvote_count", "INT DEFAULT 0");
    await addColumnIfNotExists("answers", "downvote_count", "INT DEFAULT 0");

    // Questions table new columns (solution_answer_id)
    await addColumnIfNotExists(
      "questions",
      "solution_answer_id",
      "INT NULL",
      "FOREIGN KEY(solution_answer_id) REFERENCES answers(answerid) ON DELETE SET NULL"
    );

    // No need to add/alter userid for chat_history via addColumnIfNotExists
    // because it's now directly in the CREATE TABLE statement above.

    // chat_messages table new columns and existing checks (using helper)
    await addColumnIfNotExists(
      "chat_messages",
      "avatar_url",
      "VARCHAR(2048) DEFAULT NULL"
    );
    await addColumnIfNotExists(
      "chat_messages",
      "message_text",
      "TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL"
    );
    await addColumnIfNotExists("chat_messages", "reactions", "JSON NULL");
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
