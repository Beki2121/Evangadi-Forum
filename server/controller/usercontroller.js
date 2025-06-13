// const { StatusCodes } = require("http-status-codes");
// const bcrypt = require("bcrypt");
// const dotenv = require("dotenv");
// dotenv.config();

// const dbConnection = require("../config/dbConfig");
// const crypto = require("crypto");
// const { sendResetEmail } = require("../mailer"); // adjust path

// // Forgot Password
// async function forgotPassword(req, res) {
//   const { email } = req.body;

//   if (!email) {
//     return res.status(StatusCodes.BAD_REQUEST).json({ msg: "Email required." });
//   }

//   try {
//     const [users] = await dbConnection.query(
//       "SELECT userid FROM users WHERE email = ?",
//       [email]
//     );

//     if (users.length === 0) {
//       return res
//         .status(StatusCodes.NOT_FOUND)
//         .json({ msg: "No user with that email." });
//     }

//     const token = crypto.randomBytes(32).toString("hex");
//     const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

//     await dbConnection.query(
//       "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?",
//       [token, expires, email]
//     );

//     const resetLink = `${process.env.BASE_URL}/reset-password/${token}`;
//     await sendResetEmail(email, resetLink);

//     return res
//       .status(StatusCodes.OK)
//       .json({ msg: "Password reset link sent to email." });
//   } catch (err) {
//     console.error("Forgot password error:", err);
//     return res
//       .status(StatusCodes.INTERNAL_SERVER_ERROR)
//       .json({ msg: "Server error." });
//   }
// }

// // Reset Password — updated to use token from URL param & DB lookup
// async function resetPassword(req, res) {
//   const { token } = req.params; // token from URL
//   const { newPassword } = req.body;

//   if (!token || !newPassword) {
//     return res
//       .status(400)
//       .json({ msg: "Token and new password are required." });
//   }

//   if (newPassword.length < 8) {
//     return res
//       .status(400)
//       .json({ msg: "Password must be at least 8 characters." });
//   }

//   try {
//     const [users] = await dbConnection.query(
//       "SELECT email, reset_token_expires FROM users WHERE reset_token = ?",
//       [token]
//     );

//     if (users.length === 0) {
//       return res.status(400).json({ msg: "Invalid or expired reset token." });
//     }

//     const user = users[0];
//     const now = new Date();

//     if (!user.reset_token_expires || now > new Date(user.reset_token_expires)) {
//       return res.status(400).json({ msg: "Reset token expired." });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     await dbConnection.query(
//       "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE email = ?",
//       [hashedPassword, user.email]
//     );

//     res.json({ msg: "Password reset successful." });
//   } catch (error) {
//     console.error("Error resetting password:", error);
//     res.status(500).json({ msg: "Server error during password reset." });
//   }
// }

// // Other controller functions below remain unchanged:
// async function register(req, res) {
//   const { username, firstname, lastname, email, password } = req.body;

//   const currentTimestamp = new Date();
//   const formattedTimestamp = currentTimestamp
//     .toISOString()
//     .slice(0, 19)
//     .replace("T", " ");

//   if (!username || !firstname || !lastname || !email || !password) {
//     return res
//       .status(StatusCodes.BAD_REQUEST)
//       .json({ Msg: "Please provide all required fields." });
//   }

//   if (password.length < 8) {
//     return res
//       .status(StatusCodes.BAD_REQUEST)
//       .json({ Msg: "Password should be at least 8 characters long." });
//   }

//   try {
//     const [user] = await dbConnection.query(
//       "SELECT username, userid FROM users WHERE username = ? OR email = ?",
//       [username, email]
//     );

//     if (user.length > 0) {
//       return res.status(StatusCodes.BAD_REQUEST).json({
//         Msg: "Username or Email already exists. Please try with a different username or email.",
//       });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     await dbConnection.query(
//       "INSERT INTO users (username, firstname, lastname, email, password, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
//       [username, firstname, lastname, email, hashedPassword, formattedTimestamp]
//     );

//     return res
//       .status(StatusCodes.CREATED)
//       .json({ Msg: "User created successfully." });
//   } catch (error) {
//     console.error("Error during user registration:", error);
//     return res
//       .status(StatusCodes.INTERNAL_SERVER_ERROR)
//       .json({ Msg: "Internal server error." });
//   }
// }

// async function login(req, res) {
//   const { usernameOrEmail, password } = req.body;

//   if (!usernameOrEmail || !password) {
//     return res.status(StatusCodes.BAD_REQUEST).json({
//       Msg: "Your email or password is incorrect. Please check your details and try again.",
//     });
//   }

//   try {
//     const [user] = await dbConnection.query(
//       "SELECT username, userid, password, avatar_url FROM users WHERE email = ? OR username = ?",
//       [usernameOrEmail, usernameOrEmail]
//     );

//     if (user.length === 0) {
//       return res.status(StatusCodes.NOT_FOUND).json({
//         msg: "Invalid credentials. Please check your details and try again.",
//       });
//     }

//     const isMatch = await bcrypt.compare(password, user[0].password);
//     if (!isMatch) {
//       return res.status(StatusCodes.BAD_REQUEST).json({
//         msg: "Invalid credentials. Please check your details and try again.",
//       });
//     }

//     const username = user[0].username;
//     const userid = user[0].userid;
//     const avatar_url = user[0].avatar_url;
//     const secret = process.env.JWT_SECRET;

//     const token = require("jsonwebtoken").sign(
//       { username, userid, avatar_url },
//       secret,
//       {
//         expiresIn: "1d",
//       }
//     );

//     return res.status(StatusCodes.OK).json({
//       msg: "User logged in successfully",
//       token: token,
//       user: {
//         userid: userid,
//         username: username,
//         avatar_url: avatar_url,
//       },
//     });
//   } catch (error) {
//     console.error("Error during user login:", error);
//     return res
//       .status(StatusCodes.INTERNAL_SERVER_ERROR)
//       .json({ Msg: "Internal server error." });
//   }
// }

// function check(req, res) {
//   const username = req.user.username;
//   const userid = req.user.userid;
//   const avatar_url = req.user.avatar_url;

//   return res
//     .status(StatusCodes.OK)
//     .json({ user: { username, userid, avatar_url } });
// }

// async function getUserProfileById(req, res) {
//   const { userid } = req.params;

//   try {
//     const [user] = await dbConnection.query(
//       "SELECT userid, username, firstname, lastname, email, avatar_url, createdAt FROM users WHERE userid = ?",
//       [userid]
//     );

//     if (user.length === 0) {
//       return res.status(StatusCodes.NOT_FOUND).json({
//         msg: "User not found.",
//       });
//     }

//     const userData = user[0];
//     const fullname = `${userData.firstname} ${userData.lastname}`;

//     return res.status(StatusCodes.OK).json({
//       fullname: fullname,
//       username: userData.username,
//       email: userData.email,
//       avatar_url: userData.avatar_url,
//       created_at: userData.createdAt,
//     });
//   } catch (error) {
//     console.error("Error fetching user profile:", error);
//     return res
//       .status(StatusCodes.INTERNAL_SERVER_ERROR)
//       .json({ Msg: "Internal server error while fetching user profile." });
//   }
// }

// async function updateUserProfile(req, res) {
//   const { userid } = req.params;
//   const authenticatedUserId = req.user?.userid;

//   const { fullname, username, email, password, avatar_url } = req.body;

//   let firstname, lastname;
//   if (fullname) {
//     const nameParts = fullname.split(" ");
//     firstname = nameParts[0];
//     lastname = nameParts.slice(1).join(" ") || "";
//   }

//   if (!firstname || !username || !email) {
//     return res.status(StatusCodes.BAD_REQUEST).json({
//       Msg: "Full name, username, and email are required fields.",
//     });
//   }

//   if (authenticatedUserId && parseInt(userid) !== authenticatedUserId) {
//     return res.status(StatusCodes.FORBIDDEN).json({
//       Msg: "You are not authorized to update this user's profile.",
//     });
//   }

//   try {
//     let updateQuery = `
//             UPDATE users
//             SET firstname = ?, lastname = ?, username = ?, email = ?
//         `;
//     const queryParams = [firstname, lastname, username, email];

//     if (avatar_url !== undefined) {
//       updateQuery += `, avatar_url = ?`;
//       queryParams.push(avatar_url);
//     }

//     if (password) {
//       if (password.length < 8) {
//         return res.status(StatusCodes.BAD_REQUEST).json({
//           Msg: "New password must be at least 8 characters long.",
//         });
//       }
//       const salt = await bcrypt.genSalt(10);
//       const hashedPassword = await bcrypt.hash(password, salt);
//       updateQuery += `, password = ?`;
//       queryParams.push(hashedPassword);
//     }

//     updateQuery += ` WHERE userid = ?`;
//     queryParams.push(userid);

//     const [result] = await dbConnection.query(updateQuery, queryParams);

//     if (result.affectedRows === 0) {
//       return res.status(StatusCodes.NOT_FOUND).json({
//         Msg: "User not found or no changes were made.",
//       });
//     }

//     return res.status(StatusCodes.OK).json({
//       msg: "Profile updated successfully!",
//     });
//   } catch (error) {
//     console.error("Error updating user profile:", error);
//     if (error.code === "ER_DUP_ENTRY") {
//       return res.status(StatusCodes.CONFLICT).json({
//         Msg: "The provided username or email is already in use. Please choose a different one.",
//       });
//     }
//     return res
//       .status(StatusCodes.INTERNAL_SERVER_ERROR)
//       .json({ Msg: "Internal server error while updating profile." });
//   }
// }

// async function getAllUsers(req, res) {
//   try {
//     const [users] = await dbConnection.query(
//       "SELECT userid, username, email, avatar_url FROM users ORDER BY username ASC"
//     );
//     res.status(StatusCodes.OK).json({ users });
//   } catch (error) {
//     console.error("Error fetching all users:", error);
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//       message: "Server error fetching all users.",
//       error: error.message,
//     });
//   }
// }

// module.exports = {
//   forgotPassword,
//   resetPassword,
//   login,
//   register,
//   check,
//   getUserProfileById,
//   updateUserProfile,
//   getAllUsers,
// };
// userController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/dbConfig"); // Assuming your database config path
const crypto = require("crypto"); // For generating tokens
const nodemailer = require("nodemailer"); // For sending emails

// Configure Nodemailer (ensure your .env variables are set)
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use other services like 'smtp', 'sendgrid', etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to send verification email
const sendVerificationEmail = async (email, token) => {
  const verificationLink = `${process.env.BASE_URL}/verify-email/${token}`; // BASE_URL from your .env
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email for Evangadi Forum",
    html: `
            <p>Hello,</p>
            <p>Thank you for registering with Evangadi Forum!</p>
            <p>Please verify your email address by clicking on the link below:</p>
            <p><a href="${verificationLink}">Verify Email Address</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not register for an account, please ignore this email.</p>
            <p>Best regards,</p>
            <p>The Evangadi Team</p>
        `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error(`Error sending verification email to ${email}:`, error);
    throw new Error("Failed to send verification email.");
  }
};

// Register a new user
exports.register = async (req, res) => {
  const { username, firstName, lastName, email, password } = req.body;

  if (!username || !firstName || !lastName || !email || !password) {
    return res.status(400).json({ Msg: "All fields are required." });
  }

  try {
    // Check if username or email already exists
    const [existingUsers] = await db.query(
      "SELECT userid FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ Msg: "Username or email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex"); // Generate a random token
    const tokenExpires = new Date(Date.now() + 3600000); // Token expires in 1 hour (3600000 ms)

    const [result] = await db.query(
      "INSERT INTO users (username, first_name, last_name, email, password, verification_token, token_expires_at, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        username,
        firstName,
        lastName,
        email,
        hashedPassword,
        verificationToken,
        tokenExpires,
        false,
      ]
    );

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      Msg: "User registered successfully! Please check your email to verify your account.",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ Msg: "Server error during registration." });
  }
};

// Verify user email
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    const [users] = await db.query(
      "SELECT userid, is_verified, token_expires_at FROM users WHERE verification_token = ?",
      [token]
    );

    if (users.length === 0) {
      return res
        .status(400)
        .json({ Msg: "Invalid or expired verification link." });
    }

    const user = users[0];

    if (user.is_verified) {
      return res.status(200).json({ Msg: "Email already verified." });
    }

    if (user.token_expires_at < new Date()) {
      // Optionally, regenerate token and send new email if expired
      return res
        .status(400)
        .json({
          Msg: "Verification link has expired. Please request a new one.",
        });
    }

    await db.query(
      "UPDATE users SET is_verified = ?, verification_token = NULL, token_expires_at = NULL WHERE userid = ?",
      [true, user.userid]
    );

    res
      .status(200)
      .json({ Msg: "Email verified successfully! You can now log in." });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ Msg: "Server error during email verification." });
  }
};

// Login user
exports.login = async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res
      .status(400)
      .json({ Msg: "Username/Email and password are required." });
  }

  try {
    const [users] = await db.query(
      "SELECT userid, username, email, password, is_verified FROM users WHERE username = ? OR email = ?",
      [usernameOrEmail, usernameOrEmail]
    );

    if (users.length === 0) {
      return res.status(400).json({ Msg: "Invalid credentials." });
    }

    const user = users[0];

    // ADDED: Check if email is verified
    if (!user.is_verified) {
      return res
        .status(403)
        .json({
          Msg: "Please verify your email address before logging in. Check your inbox for a verification link.",
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ Msg: "Invalid credentials." });
    }

    const token = jwt.sign(
      { userid: user.userid, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" } // Token expires in 1 hour
    );

    res.status(200).json({
      Msg: "Logged in successfully!",
      token,
      user: {
        userid: user.userid,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ Msg: "Server error during login." });
  }
};

// ... other existing functions like check, getUserProfileById, updateUserProfile, getAllUsers, forgotPassword, resetPassword ...
// Make sure to export them as well.
exports.check = async (req, res) => {
  // Your existing check logic
  res.json({ message: "Authenticated", user: req.user });
};

exports.getUserProfileById = async (req, res) => {
  const { userid } = req.params;
  try {
    const [users] = await db.query(
      "SELECT userid, username, first_name, last_name, email, is_verified FROM users WHERE userid = ?",
      [userid]
    );
    if (users.length === 0) {
      return res.status(404).json({ Msg: "User not found." });
    }
    res.status(200).json(users[0]);
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ Msg: "Server error fetching user profile." });
  }
};

exports.updateUserProfile = async (req, res) => {
  const { userid } = req.params;
  const { username, firstName, lastName, email } = req.body; // Add fields you allow updating
  // Ensure that only authorized users can update their own profile or admin can update any
  if (req.user.userid != userid && !req.user.isAdmin) {
    // Example: assuming isAdmin property
    return res
      .status(403)
      .json({ Msg: "Unauthorized to update this profile." });
  }
  try {
    await db.query(
      "UPDATE users SET username = ?, first_name = ?, last_name = ?, email = ? WHERE userid = ?",
      [username, firstName, lastName, email, userid]
    );
    res.status(200).json({ Msg: "User profile updated successfully." });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ Msg: "Server error updating user profile." });
  }
};

exports.getAllUsers = async (req, res) => {
  // Example: Only authenticated users (or admins) can see all users
  if (!req.user) {
    // Or check for admin role
    return res.status(403).json({ Msg: "Unauthorized to access all users." });
  }
  try {
    const [users] = await db.query(
      "SELECT userid, username, email, first_name, last_name, is_verified FROM users"
    );
    res.status(200).json(users);
  } catch (error) {
    console.error("Error getting all users:", error);
    res.status(500).json({ Msg: "Server error fetching all users." });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ Msg: "Email is required." });
  }

  try {
    const [users] = await db.query("SELECT userid FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      // For security, always respond with a success message even if email not found
      // to prevent email enumeration.
      return res
        .status(200)
        .json({
          Msg: "If a matching account is found, a password reset link will be sent to your email.",
        });
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour expiration

    await db.query(
      "UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE userid = ?",
      [resetToken, resetTokenExpires, user.userid]
    );

    const resetLink = `${process.env.BASE_URL}/reset-password/${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request for Evangadi Forum",
      html: `
                <p>Hello,</p>
                <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
                <p>Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
                <p>Best regards,</p>
                <p>The Evangadi Team</p>
            `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ Msg: "Password reset link sent to your email." });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res
      .status(500)
      .json({ Msg: "Server error during forgot password process." });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ Msg: "New password is required." });
  }

  try {
    const [users] = await db.query(
      "SELECT userid, reset_password_expires FROM users WHERE reset_password_token = ?",
      [token]
    );

    if (users.length === 0) {
      return res
        .status(400)
        .json({ Msg: "Invalid or expired password reset token." });
    }

    const user = users[0];

    if (user.reset_password_expires < new Date()) {
      return res
        .status(400)
        .json({
          Msg: "Password reset token has expired. Please request a new one.",
        });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE userid = ?",
      [hashedPassword, user.userid]
    );

    res.status(200).json({ Msg: "Password has been reset successfully." });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ Msg: "Server error during password reset." });
  }
};
