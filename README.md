# Evangadi Forum Project

## Overview
Evangadi Forum is a platform where users can securely register, log in, ask questions, and provide answers to foster a community of knowledge sharing. It enables users to interact and seek solutions to various issues while supporting meaningful discussions.

## Features
- **User Authentication:** Secure registration and login using email or user ID.
- **Question Posting:** Users can post questions, enabling others to review and provide solutions.
- **Answer Submission:** Users can answer posted questions, contributing their knowledge and experience.

## Tech Stack
- **Frontend:** React for a dynamic and responsive user interface.
- **Backend:** Node.js and Express for server-side logic.
- **Database:** MySQL for efficient data storage and retrieval.

## Future Enhancements
- **Question & Answer Rating:** Users can rate the quality of questions and answers.
- **Solution Marking:** Mark answers as solutions to highlight resolved questions.
- **Forgot Password:** Implement a feature for password recovery.
- **User Profile Management:** Enable users to manage and customize their profiles.
- **Upvoting:** Allow users to upvote valuable answers and questions.
- **Content Reporting:** Implement reporting for inappropriate or irrelevant content.
- **Tagging System:** Add tags to categorize content, making it easier to browse topics.
- **Adding WYSIWYG editor:** Add tags to categorize content, making it easier to browse topics.

## Getting Started
To set up the project locally, follow these steps:
1. Clone the repository.
2. Install dependencies for both the frontend and backend using `npm install`.
3. Configure environment variables for the database connection.
4. Start the backend server and then the frontend application.

## Contributing
We welcome contributions to enhance the Evangadi Forum! To contribute:
1. Fork the repository and make your changes.
2. Submit a pull request with a description of the changes.
# evangadi_forum_2024


<!-- table creator code -->
CREATE TABLE users (
  userid INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  firstname VARCHAR(50) NOT NULL,
  lastname VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE questions (
  questionid VARCHAR(20) PRIMARY KEY, -- Using VARCHAR for PK as per your plan
  userid INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(500) NOT NULL,
  tag VARCHAR(50), -- You included 'tag', which I missed in my initial schema based on the image!
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userid) REFERENCES users(userid)
);

CREATE TABLE answers (
  answerid INT AUTO_INCREMENT PRIMARY KEY,
  questionid VARCHAR(20) NOT NULL, -- Matches questionid type
  userid INT NOT NULL,
  answer VARCHAR(50) NOT NULL, -- Note: VARCHAR(50) for 'answer' might be too short for actual answers. Consider TEXT or VARCHAR(MAX_LENGTH).
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (questionid) REFERENCES questions(questionid),
  FOREIGN KEY (userid) REFERENCES users(userid)
);
CREATE TABLE answer_ratings (
  rating_id INT AUTO_INCREMENT PRIMARY KEY,
  answer_id INT NOT NULL,
  user_id INT NOT NULL,
  rating_type ENUM('upvote', 'downvote') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (answer_id, user_id),
  FOREIGN KEY (answer_id) REFERENCES answers(answerid),
  FOREIGN KEY (user_id) REFERENCES users(userid)
);