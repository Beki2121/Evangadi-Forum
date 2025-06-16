const dbConnection = require("../config/dbConfig"); // Adjust path as needed based on actual file structure

/**
 * Fetches the private message history between the logged-in user and another participant.
 */
async function getMessageHistory(req, res) {
  const loggedInUserId = req.user.userid; // Assuming authMiddleware sets req.user
  const { participantId } = req.params;

  if (!participantId) {
    return res.status(400).json({ msg: "Participant ID is required." });
  }

  // Validate participantId is a number if your user IDs are numeric
  if (isNaN(parseInt(participantId))) {
    return res.status(400).json({ msg: "Invalid Participant ID format." });
  }

  try {
    const query = `
      SELECT message_id, sender_id, receiver_id, content, timestamp, is_read 
      FROM private_messages 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY timestamp ASC
    `;
    // Ensure participantId is converted to the correct type if necessary, e.g., integer
    const [messages] = await dbConnection.query(query, [
      loggedInUserId,
      parseInt(participantId),
      parseInt(participantId),
      loggedInUserId,
    ]);

    res.status(200).json(messages); // Send the array of messages directly
  } catch (error) {
    console.error("Error fetching message history:", error);
    res.status(500).json({ msg: "Server error fetching message history." });
  }
}

module.exports = { getMessageHistory };
