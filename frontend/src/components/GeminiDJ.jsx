// frontend/src/components/GeminiDJ.jsx
import { useState } from "react";
import { useSelector } from "react-redux"; // Pull context safely
import axios from "axios";
import socket from "../socket";

// Match backend URL configuration block
const API_BASE_URL = "https://music-room-1-ocnj.onrender.com";

function GeminiDJ() {
  // Read active room channel context directly from state layers
  const { activeRoomId } = useSelector((state) => state.room);
  
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");

  const askGeminiDJ = async () => {
    if (!prompt.trim()) return;
    if (!activeRoomId) {
      setAiResponse("⚠️ Please join a room channel before invoking the AI DJ!");
      return;
    }

    setLoading(true);
    setAiResponse("");

    try {
      const res = await axios.post(`${API_BASE_URL}/api/gemini/suggest`, {
        prompt: prompt.trim(),
        roomId: activeRoomId,
      });

      if (res.data && res.data.suggestion) {
        setAiResponse(`🤖 DJ: ${res.data.suggestion}`);
        
        // If the AI auto-selected a matching track ID, pipe it out over socket channels
        if (res.data.videoId) {
          socket.emit("change-video", { roomId: activeRoomId, videoId: res.data.videoId });
        }
      } else {
        setAiResponse("AI DJ couldn't find a matching song recommendation.");
      }
    } catch (err) {
      console.error(err);
      setAiResponse("Failed to fetch recommendation from Gemini nodes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl p-4 shadow-xl flex flex-col">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
        <span className="w-1 h-2 bg-purple-500 rounded-full animate-pulse"></span>
        Gemini Smart AI DJ
      </h2>

      <div className="flex flex-col gap-2">
        <textarea
          rows="2"
          placeholder="e.g., 'Play something smooth for a coding session' or 'Find upbeat techno'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
        />
        
        <button
          onClick={askGeminiDJ}
          disabled={loading || !activeRoomId}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 font-bold py-2 rounded-xl text-xs uppercase tracking-wide transition-all active:scale-95 shrink-0"
        >
          {loading ? "Thinking..." : "Consult AI DJ"}
        </button>
      </div>

      {aiResponse && (
        <div className="mt-3 p-2.5 bg-slate-950/40 border border-slate-800/50 rounded-xl text-[11px] text-purple-200 leading-relaxed max-h-[100px] overflow-y-auto">
          {aiResponse}
        </div>
      )}
    </div>
  );
}

export default GeminiDJ;