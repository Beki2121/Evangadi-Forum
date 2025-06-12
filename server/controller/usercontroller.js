const dbConnection = require("../config/dbConfig"); // Corrected to match your existing import
const bcrypt = require("bcrypt");
const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

// Function to register a new user
async function register(req, res) {
  const { username, firstname, lastname, email, password } = req.body;

  const currentTimestamp = new Date();
  // Adjust timestamp to match your desired timezone if necessary (e.g., +3 hours for EAT)
  // currentTimestamp.setHours(currentTimestamp.getHours() + 3);
  const formattedTimestamp = currentTimestamp
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  // Check if all required fields are provided
  if (!username || !firstname || !lastname || !email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ Msg: "Please provide all required fields." });
  }

  // Check if password is at least 8 characters long
  if (password.length < 8) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ Msg: "Password should be at least 8 characters long." });
  }

  try {
    // Check if the username or email already exists
    const [user] = await dbConnection.query(
      "SELECT username, userid FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (user.length > 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        Msg: "Username or Email already exists. Please try with a different username or email.",
      });
    }

    // Encrypting the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user into the database
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

  // Check if username/email and password are provided
  if (!usernameOrEmail || !password) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      Msg: "Your email or password is incorrect. Please check your details and try again.",
    });
  }

  try {
    // Query the user by email or username
    const [user] = await dbConnection.query(
      "SELECT username, userid, password FROM users WHERE email = ? OR username = ?",
      [usernameOrEmail, usernameOrEmail]
    );

    // Check if user exists
    if (user.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: "Invalid credentials. Please check your details and try again.",
      });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Invalid credentials. Please check your details and try again.",
      });
    }

    // Generate JWT token
    const username = user[0].username;
    const userid = user[0].userid;
    const secret = process.env.JWT_SECRET;

    const token = jwt.sign({ username, userid }, secret, {
      expiresIn: "1d", // Token expires in 1 day
    });

    // Return the token and success message
    return res.status(StatusCodes.OK).json({
      msg: "User logged in successfully",
      token: token,
      user: {
        // Include user data for frontend context
        userid: userid,
        username: username,
        // You might want to fetch and include avatar_url here if stored in DB
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
  // If you store email or avatar_url in the token, you could send them here too
  return res.status(StatusCodes.OK).json({ user: { username, userid } }); // Wrap in 'user' object for consistency with frontend
}

/**
 * Fetches a user's profile data by their ID.
 * @param {object} req - The request object, containing `userId` in `req.params`.
 * @param {object} res - The response object.
 */
async function getUserProfileById(req, res) {
  const { userid } = req.params; // Get userid from URL parameters (matching frontend)

  try {
    // Updated: Select username along with other user details
    const [user] = await dbConnection.query(
      "SELECT userid, username, firstname, lastname, email, avatar_url, createdAt FROM users WHERE userid = ?", // Added avatar_url
      [userid]
    );

    // If no user is found with the given ID, return a 404
    if (user.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        msg: "User not found.",
      });
    }

    const userData = user[0];
    // Combine firstname and lastname to create fullname for the frontend
    const fullname = `${userData.firstname} ${userData.lastname}`;

    // Return the formatted user data, including username and avatar_url
    return res.status(StatusCodes.OK).json({
      fullname: fullname,
      username: userData.username, // Include username
      email: userData.email,
      avatar_url: userData.avatar_url, // Include avatar_url
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
 * @param {object} req - The request object, containing `userid` in `req.params` and updated data in `req.body`.
 * @param {object} res - The response object.
 */
async function updateUserProfile(req, res) {
  const { userid } = req.params;
  // req.user.userid is available if authMiddleware is used on the route
  const authenticatedUserId = req.user?.userid; // Optional chaining in case authMiddleware is not applied or user is anonymous

  const { fullname, username, email, password, avatar_url } = req.body; // Added avatar_url

  // Split fullname back into firstname and lastname
  let firstname, lastname;
  if (fullname) {
    const nameParts = fullname.split(" ");
    firstname = nameParts[0];
    lastname = nameParts.slice(1).join(" ") || ""; // Handle cases with no last name
  }

  // Basic validation
  if (!firstname || !username || !email) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      Msg: "Full name, username, and email are required fields.",
    });
  }

  // Check if the authenticated user is authorized to update this profile
  // This is crucial for security. Only a user can update their own profile.
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

    // Handle avatar_url update if provided
    if (avatar_url !== undefined) {
      // Check if avatar_url is explicitly provided (can be null)
      updateQuery += `, avatar_url = ?`;
      queryParams.push(avatar_url);
    }

    // Handle password update if a new password is provided
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
    // Check for duplicate entry error (e.g., if new email/username already exists)
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
 * This is used for the chat's user list to display online/offline status.
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 */
async function getAllUsers(req, res) {
  try {
    // Select only necessary user information (avoid sensitive data like passwords)
    const [users] = await dbConnection.query(
      // Using dbConnection
      "SELECT userid, username, email, avatar_url FROM users ORDER BY username ASC"
    );

    // If your `dbConnection.query` directly returns the rows array without nested arrays,
    // you might not need the [users] destructuring.
    // For `mysql2`'s promise-based `connection.execute` or `pool.execute`, `[rows]` is standard.
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
  getAllUsers, // Export the new function
};
