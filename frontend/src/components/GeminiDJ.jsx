import { useState } from "react";
import axios from "axios";

function GeminiDJ({ onSelectTrack }) {
  const [prompt, setPrompt] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGetRecommendations = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setRecommendation("");
    try {
      // Points to your newly mounted backend route
      const response = await axios.post("https://music-room-1-ocnj.onrender.com/api/gemini/recommend", {
        prompt: prompt,
      });

      if (response.data.success) {
        setRecommendation(response.data.recommendation);
      }
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      setRecommendation("Failed to wake up the AI DJ. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white p-4 rounded-xl border border-purple-500/30 shadow-lg my-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">✨</span>
        <h3 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Gemini AI Room DJ
        </h3>
      </div>

      <form onSubmit={handleGetRecommendations} className="flex gap-2 mb-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., chill coding vibes, retro 80s rock..."
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:outline-none focus:border-purple-500 text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Thinking..." : "Ask DJ"}
        </button>
      </form>

      {recommendation && (
        <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-sm max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed custom-scrollbar">
          {recommendation}
        </div>
      )}
    </div>
  );
}

export default GeminiDJ;