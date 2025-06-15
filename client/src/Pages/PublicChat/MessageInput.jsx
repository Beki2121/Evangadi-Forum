import React, { useState, useRef, useEffect } from "react";

// Assuming MessageItem receives a 'message' object and 'currentUser' object
function MessageItem({ message, currentUser, onEdit, onDelete, onReact }) {
  const isMyMessage = message.userid === currentUser.userid;
  const audioRef = useRef(null); // Ref for the audio element
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const formatTime = (seconds) => {
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
    if (audio) {
      const setAudioData = () => {
        if (message.audio_data && message.audio_type) {
          // Construct the Data URI for playback
          audio.src = `data:${message.audio_type};base64,${message.audio_data}`;
        }
      };

      setAudioData(); // Set initial audio source

      const onEnded = () => setIsPlaying(false);
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);
      const onTimeUpdate = () => setCurrentTime(audio.currentTime);

      audio.addEventListener("ended", onEnded);
      audio.addEventListener("play", onPlay);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
        alert(
          "Audio Playback Error: Could not play this audio message. See console for details."
        );
        setIsPlaying(false); // Stop playing state on error
      });

      // Cleanup event listeners
      return () => {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("play", onPlay);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.removeEventListener("error", (e) =>
          console.error("Audio playback error:", e)
        );
      };
    }
  }, [message.audio_data, message.audio_type]); // Re-run effect if audio data changes

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
                audioRef.current
                  ? (currentTime / audioRef.current.duration) * 100
                  : 0
              }
              onChange={(e) => {
                if (audioRef.current) {
                  audioRef.current.currentTime =
                    (e.target.value / 100) * audioRef.current.duration;
                }
              }}
              className="audio-progress-bar"
            />
            <span>
              {formatTime(currentTime)} / {formatTime(message.audio_duration)}
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
          message.message_text &&
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
