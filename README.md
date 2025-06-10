CREATE TABLE users (
userid INT(20) NOT NULL AUTO_INCREMENT,
username VARCHAR(20) NOT NULL,
firstname VARCHAR(20) NOT NULL,
lastname VARCHAR(20) NOT NULL,
email VARCHAR(40) NOT NULL,
password VARCHAR(100) NOT NULL,
createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY(userid)
);

    CREATE TABLE questions (
    id INT(20) NOT NULL AUTO_INCREMENT,
    questionid VARCHAR(100) NOT NULL UNIQUE,
    userid INT(20) NOT NULL,
    title VARCHAR(50) NOT NULL,
    description VARCHAR(200) NOT NULL,
    tag VARCHAR(20),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id, questionid),
    FOREIGN KEY(userid) REFERENCES users(userid)
    );

    CREATE TABLE answers (
    answerid INT(11) NOT NULL AUTO_INCREMENT,
    userid INT(20) NOT NULL,
    questionid VARCHAR(100) NOT NULL,
    answer VARCHAR(200) NOT NULL,
    `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
    `rating_count` int(11) DEFAULT '0',
    PRIMARY KEY(answerid),
    FOREIGN KEY(questionid) REFERENCES questions(questionid),
    FOREIGN KEY(userid) REFERENCES users(userid)
    );
    CREATE TABLE `answer_ratings` (
    `ratingid` int(11) NOT NULL AUTO_INCREMENT,
    `answerid` int(11) NOT NULL,
    `userid` int(11) NOT NULL,
    `vote_type` tinyint(4) NOT NULL,
    `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`ratingid`),
    UNIQUE KEY `answerid` (`answerid`,`userid`),
    KEY `userid` (`userid`),
    FOREIGN KEY (`answerid`) REFERENCES `answers` (`answerid`) ON DELETE CASCADE,
    FOREIGN KEY (`userid`) REFERENCES `users` (`userid`) ON DELETE CASCADE
    )
