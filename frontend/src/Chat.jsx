import { useState, useEffect, useRef } from "react";
import socket from "./socket";

function Chat({ roomId, showNotification }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("incoming-message", (msgPayload) => {
      setMessages((prev) => [...prev, msgPayload]);
    });

    return () => {
      socket.off("incoming-message");
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!roomId || !roomId.trim()) {
      showNotification("You must enter a room channel before messaging!", "error");
      return;
    }

    socket.emit("chat-message", {
      roomId,
      msg: message.trim(),
    });

    setMessage("");
  };

  return (
    <div className="bg-[#121a2e]/40 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[350px] transition-all">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 shrink-0 flex justify-between items-center">
        <span>💬 Live Room Chat</span>
        <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono text-slate-400">
          {messages.length} logs
        </span>
      </h3>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center opacity-30 text-center">
            <p className="text-[11px] text-slate-400 italic">No message history logs inside this room channel feed</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={index} 
              className="bg-[#05070d]/60 border border-slate-900/60 px-3 py-2 rounded-xl text-xs text-slate-300 break-words animate-fadeIn"
            >
              <div className="flex justify-between items-center opacity-40 text-[9px] font-mono mb-1">
                <span>ID: {msg.id.substring(0, 5)}...</span>
                <span>{msg.timestamp}</span>
              </div>
              <p className="leading-relaxed text-slate-200">{msg.text}</p>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0">
        <input
          placeholder="Say something to the room..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 bg-[#05070d] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button 
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md shadow-emerald-500/5 active:scale-95"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;