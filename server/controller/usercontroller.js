const { StatusCodes } = require("http-status-codes");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const dbConnection = require("../config/dbConfig");

// Function to register a new user
async function register(req, res) {
  const { username, firstname, lastname, email, password } = req.body;

  const currentTimestamp = new Date();
  const formattedTimestamp = currentTimestamp
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  if (!username || !firstname || !lastname || !email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ Msg: "Please provide all required fields." });
  }

  if (password.length < 8) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ Msg: "Password should be at least 8 characters long." });
  }

  try {
    const [user] = await dbConnection.query(
      "SELECT username, userid FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (user.length > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        Msg: "Username or Email already exists. Please try with a different username or email.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Corrected INSERT query to include all fields as per schema
    await dbConnection.query(
      "INSERT INTO users (username, firstname, lastname, email, password, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      [username, firstname, lastname, email, hashedPassword, formattedTimestamp]
    );

    return res
      .status(StatusCodes.CREATED)
      .json({ Msg: "User created successfully." });
  } catch (error) {
    console.error("Error during user registration:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ Msg: "Internal server error." });
  }
}

// Function to log in a user
async function login(req, res) {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      Msg: "Your email or password is incorrect. Please check your details and try again.",
    });
  }

  try {
    const [user] = await dbConnection.query(
      "SELECT username, userid, password, avatar_url FROM users WHERE email = ? OR username = ?",
      [usernameOrEmail, usernameOrEmail]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: "Invalid credentials. Please check your details and try again.",
      });
    }

    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Invalid credentials. Please check your details and try again.",
      });
    }

    const username = user[0].username;
    const userid = user[0].userid;
    const avatar_url = user[0].avatar_url;
    const secret = process.env.JWT_SECRET;

    // Include avatar_url in the JWT token payload
    const token = jwt.sign({ username, userid, avatar_url }, secret, {
      expiresIn: "1d",
    });

    return res.status(StatusCodes.OK).json({
      msg: "User logged in successfully",
      token: token,
      user: {
        userid: userid,
        username: username,
        avatar_url: avatar_url,
      },
    });
  } catch (error) {
    console.error("Error during user login:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ Msg: "Internal server error." });
  }
}

// Function to check user authentication status
function check(req, res) {
  const username = req.user.username;
  const userid = req.user.userid;
  const avatar_url = req.user.avatar_url; // Assuming avatar_url is in req.user from authMiddleware

  return res
    .status(StatusCodes.OK)
    .json({ user: { username, userid, avatar_url } });
}

/**
 * Fetches a user's profile data by their ID.
 */
async function getUserProfileById(req, res) {
  const { userid } = req.params;

  try {
    const [user] = await dbConnection.query(
      "SELECT userid, username, firstname, lastname, email, avatar_url, createdAt FROM users WHERE userid = ?",
      [userid]
    );

    if (user.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: "User not found.",
      });
    }

    const userData = user[0];
    const fullname = `${userData.firstname} ${userData.lastname}`;

    return res.status(StatusCodes.OK).json({
      fullname: fullname,
      username: userData.username,
      email: userData.email,
      avatar_url: userData.avatar_url,
      created_at: userData.createdAt,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ Msg: "Internal server error while fetching user profile." });
  }
}

/**
 * Updates a user's profile information.
 */
async function updateUserProfile(req, res) {
  const { userid } = req.params;
  const authenticatedUserId = req.user?.userid;

  const { fullname, username, email, password, avatar_url } = req.body;

  let firstname, lastname;
  if (fullname) {
    const nameParts = fullname.split(" ");
    firstname = nameParts[0];
    lastname = nameParts.slice(1).join(" ") || "";
  }

  if (!firstname || !username || !email) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      Msg: "Full name, username, and email are required fields.",
    });
  }

  if (authenticatedUserId && parseInt(userid) !== authenticatedUserId) {
    return res.status(StatusCodes.FORBIDDEN).json({
      Msg: "You are not authorized to update this user's profile.",
    });
  }

  try {
    let updateQuery = `
            UPDATE users
            SET firstname = ?, lastname = ?, username = ?, email = ?
        `;
    const queryParams = [firstname, lastname, username, email];

    if (avatar_url !== undefined) {
      updateQuery += `, avatar_url = ?`;
      queryParams.push(avatar_url);
    }

    if (password) {
      if (password.length < 8) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          Msg: "New password must be at least 8 characters long.",
        });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateQuery += `, password = ?`;
      queryParams.push(hashedPassword);
    }

    updateQuery += ` WHERE userid = ?`;
    queryParams.push(userid);

    const [result] = await dbConnection.query(updateQuery, queryParams);

    if (result.affectedRows === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        Msg: "User not found or no changes were made.",
      });
    }

    return res.status(StatusCodes.OK).json({
      msg: "Profile updated successfully!",
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(StatusCodes.CONFLICT).json({
        Msg: "The provided username or email is already in use. Please choose a different one.",
      });
    }
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ Msg: "Internal server error while updating profile." });
  }
}

/**
 * Fetches all registered users, returning their basic information.
 */
async function getAllUsers(req, res) {
  console.log("Attempting to fetch all users...");
  try {
    const [users] = await dbConnection.query(
      "SELECT userid, username, email, avatar_url FROM users ORDER BY username ASC"
    );
    console.log(`Successfully fetched ${users.length} users.`);
    res.status(StatusCodes.OK).json({ users: users });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error fetching all users." });
  }
}

module.exports = {
  login,
  register,
  check,
  getUserProfileById,
  updateUserProfile,
  getAllUsers,
};
