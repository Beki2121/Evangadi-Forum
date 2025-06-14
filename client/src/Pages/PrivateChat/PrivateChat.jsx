const [callStartTime, setCallStartTime] = useState(null);
const [duration, setDuration] = useState("00:00");

useEffect(() => {
  let interval;
  if (callStartTime) {
    interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - callStartTime) / 1000);
      const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
      const secs = String(seconds % 60).padStart(2, "0");
      setDuration(`${minutes}:${secs}`);
    }, 1000);
  }
  return () => clearInterval(interval);
}, [callStartTime]);
{
  callStartTime && <p className="text-sm text-gray-500">🕒 {duration}</p>;
}
const [incomingCall, setIncomingCall] = useState(null); // { fromUserId, fromName }
const [showCallModal, setShowCallModal] = useState(false);

useEffect(() => {
  socket.on("voice-offer", ({ fromUserId, offer, fromName }) => {
    setIncomingCall({ fromUserId, offer, fromName });
    setShowCallModal(true);
  });
}, []);

const handleAccept = () => {
  if (incomingCall) {
    handleVoiceOffer(socket, incomingCall.fromUserId, incomingCall.offer);
    setShowCallModal(false);
  }
};

const handleReject = () => {
  setShowCallModal(false);
};
<IncomingCallModal
  visible={showCallModal}
  callerName={incomingCall?.fromName}
  onAccept={handleAccept}
  onReject={handleReject}
/>;
