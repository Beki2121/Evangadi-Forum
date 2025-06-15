import React, { useState, useRef, useEffect } from "react";

// Assuming MessageItem receives a 'message' object and 'currentUser' object
function MessageItem({ message, currentUser, onEdit, onDelete, onReact }) {
  const isMyMessage = message.userid === currentUser.userid;
  const audioRef = useRef(null); // Ref for the audio element
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(
    message.audio_duration || 0
  ); // Use message.audio_duration as initial, update if needed

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;

    const setAudioSource = () => {
      if (message.audio_data && message.audio_type) {
        // Construct the Data URI for playback
        const dataUri = `data:${message.audio_type};base64,${message.audio_data}`;
        if (audio.src !== dataUri) {
          // Only update src if it's different to prevent unnecessary reloads
          audio.src = dataUri;
          console.log(
            "Audio Data URI set for playback (first 100 chars):",
            audio.src.substring(0, 100) + "..."
          );
          console.log("Audio Type:", message.audio_type);
          console.log("Audio Data length:", message.audio_data.length);
          console.log("Audio Duration (from message):", message.audio_duration);

          // If audio_duration is not provided or 0, try to get it from metadata
          if (!message.audio_duration || message.audio_duration === 0) {
            audio.onloadedmetadata = () => {
              setAudioDuration(audio.duration);
              console.log("Audio Duration (from metadata):", audio.duration);
            };
            audio.onerror = (e) => {
              console.error("Error loading audio metadata in MessageItem:", e);
              // Optionally set duration to a default or error state
              setAudioDuration(0);
            };
          }
        }
      } else {
        // If no audio data, ensure src is cleared to prevent old audio playing
        if (audio.src) {
          audio.src = "";
          setAudioDuration(0);
          setCurrentTime(0);
          setIsPlaying(false);
        }
      }
    };

    if (audio) {
      setAudioSource(); // Set initial audio source

      const onEnded = () => setIsPlaying(false);
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onTimeUpdate = () => setCurrentTime(audio.currentTime);

      // Event listeners for the audio element
      audio.addEventListener("ended", onEnded);
      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("error", (e) => {
        console.error("Audio playback error event in MessageItem:", e);
        if (audio.error) {
          console.error("Audio element error code:", audio.error.code);
          console.error("Audio element error message:", audio.error.message);
        }
        alert(
          "Audio Playback Error: Could not play this audio message. See console for details."
        );
        setIsPlaying(false); // Stop playing state on error
      });

      // Cleanup event listeners when component unmounts or dependencies change
      return () => {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("timeupdate", onTimeUpdate);
        // Pass the same function reference for removeEventListener
        audio.removeEventListener("error", (e) =>
          console.error("Audio playback error event in MessageItem:", e)
        );
      };
    }
  }, [message.audio_data, message.audio_type, message.audio_duration]); // Re-run effect if audio data, type, or duration changes

  // Helper to determine message display class
  const messageClass = isMyMessage ? "my-message" : "other-message";

  return (
    <div className={`message-item ${messageClass}`}>
      <div className="message-header">
        <span className="username">{message.username}</span>
        {/* You might want to display avatar here */}
        {message.avatar_url && (
          <img
            src={message.avatar_url}
            alt="Avatar"
            className="message-avatar"
          />
        )}
      </div>
      <div className="message-content">
        {message.is_deleted ? (
          <span className="deleted-message">
            This message has been deleted.
          </span>
        ) : message.file_data ? (
          // Render file message
          <div className="file-message">
            {message.message_text && <p>{message.message_text}</p>}
            <a
              href={`data:${message.file_type};base64,${message.file_data}`}
              download={message.file_name}
            >
              <i className="fas fa-file"></i> {message.file_name}
            </a>
          </div>
        ) : message.audio_data ? (
          // Render audio message
          <div className="audio-message">
            <button onClick={handlePlayPause}>
              {isPlaying ? (
                <i className="fas fa-pause"></i>
              ) : (
                <i className="fas fa-play"></i>
              )}
            </button>
            <input
              type="range"
              value={
                audioRef.current &&
                !isNaN(audioRef.current.duration) &&
                audioRef.current.duration > 0
                  ? (currentTime / audioRef.current.duration) * 100
                  : 0
              }
              onChange={(e) => {
                if (audioRef.current && !isNaN(audioRef.current.duration)) {
                  audioRef.current.currentTime =
                    (e.target.value / 100) * audioRef.current.duration;
                }
              }}
              className="audio-progress-bar"
              min="0"
              max="100"
              step="0.1" // Allow finer control
              disabled={
                !audioRef.current ||
                isNaN(audioRef.current.duration) ||
                audioRef.current.duration === 0
              }
            />
            <span>
              {formatTime(currentTime)} / {formatTime(audioDuration)}
            </span>
            <audio ref={audioRef} preload="metadata" />{" "}
            {/* Hidden audio element */}
          </div>
        ) : (
          // Render text message
          <p>{message.message_text}</p>
        )}
      </div>
      <div className="message-footer">
        <span className="timestamp">
          {new Date(message.created_at).toLocaleTimeString()}
        </span>
        {message.edited_at && <span className="edited-tag">(edited)</span>}
        {/* Reactions display (simplified, you'll expand this) */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="message-reactions">
            {message.reactions.map((r, index) => (
              <span key={index} title={r.usernames.join(", ")}>
                {r.emoji} {r.userids.length}
              </span>
            ))}
          </div>
        )}
        {/* Example: Edit/Delete/React buttons (you'll style these) */}
        {!message.is_deleted &&
          isMyMessage &&
          message.message_text && // Only allow text messages to be edited this way initially
          !message.file_data &&
          !message.audio_data && (
            <>
              <button
                onClick={() => onEdit(message.message_id, message.message_text)}
              >
                Edit
              </button>
            </>
          )}
        {!message.is_deleted && isMyMessage && (
          <button onClick={() => onDelete(message.message_id)}>Delete</button>
        )}
        {!message.is_deleted && (
          <button onClick={() => onReact(message.message_id, "👍")}>👍</button>
        )}
        {/* Add more reaction buttons as needed */}
      </div>
    </div>
  );
}

export default MessageItem;
