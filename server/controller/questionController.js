const { StatusCodes } = require("http-status-codes");
const dbConnection = require("../config/dbConfig");
const crypto = require("crypto");

// post questions / ask questions
async function postQuestion(req, res) {
  const { userid, title, description, tag } = req.body;
  // Create a new date object
  const currentTimestamp = new Date();

  // Adjust the time by UTC+3 hours
  const adjustedDate = new Date(
    currentTimestamp.getTime() + 3 * 60 * 60 * 1000
  );

  // Format the date as 'YYYY-MM-DD HH:mm:ss'
  const formattedTimestamp = adjustedDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  if (!userid || !title || !description) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "All fields are required" });
  }
  const questionid = crypto.randomBytes(10).toString("hex");
  try {
    await dbConnection.query(
      "insert into questions (questionid, userid, title, description, tag,createdAt) values ( ?, ?, ?, ?, ?,?)",
      [questionid, userid, title, description, tag, formattedTimestamp]
    );
    return res
      .status(StatusCodes.CREATED)
      .json({ message: "question posted successfully" });
  } catch (err) {
    console.error(err); // Use console.error for errors
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR) // Use StatusCodes for consistency
      .json({ message: "Something went wrong, please try again later" });
  }
}

// get all questions -- CORRECTED FUNCTION
async function getAllQuestions(req, res) {
  try {
    const [questions] = await dbConnection.query(`SELECT
            q.questionid,
            q.title,
            q.description,
            q.createdAt,
            u.username
        FROM questions q
        INNER JOIN users u ON q.userid = u.userid
        ORDER BY q.createdAt DESC`); // Removed extra spaces/invisible characters
    return res.status(StatusCodes.OK).json({
      message: questions,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Something went wrong, please try again later" });
  }
}

// get single question and answers (already corrected in previous response)
async function getQuestionAndAnswer(req, res) {
  const questionid = req.params.questionId;

  try {
    const [questionRows] = await dbConnection.query(
      `SELECT
          q.questionid,
          q.title,
          q.description,
          q.createdAt AS qtn_createdAt,
          u.username AS qtn_username
       FROM questions q
       INNER JOIN users u ON q.userid = u.userid
       WHERE q.questionid = ?`,
      [questionid]
    );

    if (questionRows.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Question not found" });
    }

    const questionDetails = questionRows[0];

    const [answersRows] = await dbConnection.query(
      `SELECT
          a.answerid,
          a.userid,
          a.answer,
          a.createdAt,
          a.rating_count,
          u.username AS answer_username
       FROM answers a
       INNER JOIN users u ON a.userid = u.userid
       WHERE a.questionid = ?
       ORDER BY a.createdAt DESC`,
      [questionid]
    );

    questionDetails.answers = answersRows.map((answer) => ({
      answerid: answer.answerid,
      userid: answer.userid,
      username: answer.answer_username,
      answer: answer.answer,
      createdAt: answer.createdAt,
      rating_count: answer.rating_count,
    }));

    res.status(StatusCodes.OK).json(questionDetails);
  } catch (error) {
    console.error("Error fetching question details:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching question details. Please try again later.",
    });
  }
}

module.exports = { postQuestion, getAllQuestions, getQuestionAndAnswer };
