import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux"; // Added useDispatch hook import
import socket from "./socket";

function Chat({ roomId, showNotification }) {
  const dispatch = useDispatch(); // Initialized the dispatch variable to fix the error!

  // Pull the current username safely from the global Redux store layer
  const { username } = useSelector((state) => state.room || {});

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listen for incoming chat messages from the server socket channel
    const handleChatMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("chat-message", handleChatMessage);

    // Clear message feed when changing or entering room frames
    setMessages([]);

    return () => {
      socket.off("chat-message", handleChatMessage);
    };
  }, [roomId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!roomId) {
      showNotification("You must join a room to send messages!", "error");
      return;
    }

    // Emit message transaction block to server
    socket.emit("chat-message", {
      roomId,
      message: message.trim(),
    });

    setMessage("");
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-4 shadow-xl h-[340px] flex flex-col justify-between">
      {/* Messages Feed Layer Container Box */}
      <div className="flex-1 overflow-y-auto mb-3 space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic text-center py-8">
            Room chat initialized. Say hello!
          </p>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender === username;
            return (
              <div
                key={index}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] text-slate-400 font-medium mb-0.5 px-1">
                  {msg.sender}
                </span>
                <div
                  className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed break-words font-medium ${
                    isMe
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-tr-none"
                      : "bg-slate-950/70 border border-slate-800/60 text-slate-200 rounded-tl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Message Form Deck */}
      <form onSubmit={sendMessage} className="flex gap-2 shrink-0">
        <input
          type="text"
          placeholder={roomId ? "Type your message..." : "Join a room to text..."}
          disabled={!roomId}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!roomId}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 font-bold px-4 rounded-xl text-xs uppercase tracking-wider transition-colors shrink-0 active:scale-95"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;