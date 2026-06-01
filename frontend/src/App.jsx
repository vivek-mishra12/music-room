import { useState, useRef, useEffect } from "react";
import YouTube from "react-youtube";
import axios from "axios";
import socket from "./socket";
import Chat from "./Chat";

function App() {
  // Authentication & User Session Layer
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Music Room Dashboard Core State
  const [roomId, setRoomId] = useState("");
  const [videoId, setVideoId] = useState("");
  const [roomState, setRoomState] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [queue, setQueue] = useState([]);
  
  // Custom Toast Message State Layer
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" });
  
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Helper trigger to handle smooth auto-dismissing notification banners
  const showNotification = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: "", type: "success" });
    }, 4000);
  };

  // --- Socket Connection Lifecycle Orchestration ---
  useEffect(() => {
    if (token) {
      socket.auth = { token };
      socket.connect(); 
    } else {
      socket.disconnect(); 
    }

    const handleVideoChanged = (id) => setVideoId(id);
    const handleRoomState = (data) => {
      setRoomState(data);
      if (data.videoId) setVideoId(data.videoId);
      if (data.queue) setQueue(data.queue);
    };
    const handleQueueUpdated = (newQueue) => setQueue(newQueue);
    
    const handlePlay = () => {
      if (playerRef.current && typeof playerRef.current.playVideo === "function") {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    };
    const handlePause = () => {
      if (playerRef.current && typeof playerRef.current.pauseVideo === "function") {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      }
    };

    socket.on("video-changed", handleVideoChanged);
    socket.on("room-state", handleRoomState);
    socket.on("queue-updated", handleQueueUpdated);
    socket.on("play", handlePlay);
    socket.on("pause", handlePause);

    return () => {
      socket.off("video-changed", handleVideoChanged);
      socket.off("room-state", handleRoomState);
      socket.off("queue-updated", handleQueueUpdated);
      socket.off("play", handlePlay);
      socket.off("pause", handlePause);
    };
  }, [token]);

  // Periodic Playback timestamp sync loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        playerRef.current &&
        roomId.trim() &&
        token &&
        typeof playerRef.current.getCurrentTime === "function"
      ) {
        socket.emit("time-update", {
          roomId: roomId.trim(),
          currentTime: playerRef.current.getCurrentTime(),
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [roomId, token]);

  // --- Authentication Request Handlers ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) return;

    try {
      const res = await axios.post("https://music-room-1-ocnj.onrender.com/api/auth/login", {
        email: authEmail,
        password: authPassword,
      });
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username);
      
      setUsername(res.data.username);
      setToken(res.data.token);
      showNotification(`Welcome back, ${res.data.username}!`, "success");
    } catch (err) {
      showNotification(err.response?.data?.message || "Invalid Email or Password Credentials", "error");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!authUsername.trim() || !authEmail.trim() || !authPassword.trim()) return;

    try {
      await axios.post("https://music-room-1-ocnj.onrender.com/api/auth/signup", {
        username: authUsername,
        email: authEmail,
        password: authPassword,
      });
      showNotification("Registration successful! Please log in.", "success");
      setIsRegistering(false);
    } catch (err) {
      showNotification(err.response?.data?.message || "Signup registration execution failed", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    
    setToken("");
    setUsername("");
    setRoomId("");
    setVideoId("");
    setQueue([]);
    setRoomState(null);
    showNotification("Disconnected gracefully from server nodes.", "error");
  };

  // --- Core Application Dashboard Handlers ---
  const joinRoom = () => {
    const cleanRoomId = roomId.trim();

    if (!cleanRoomId) {
      showNotification("Please enter a valid Room ID key!", "error");
      return;
    }

    socket.emit("join-room", cleanRoomId);
    showNotification(`✨ Connected Successfully! Joined Room Channel: "${cleanRoomId}"`, "success");
  };

  const searchSongs = async () => {
    if (!searchQuery.trim()) return;

    try {
      const res = await axios.get("https://music-room-1-ocnj.onrender.com/search", {
        params: { q: searchQuery },
      });
      setResults(res.data);
    } catch (err) {
      console.log(err);
      showNotification("YouTube search query retrieval failed", "error");
    }
  };

  const addSongToQueue = (video) => {
    if (!roomId.trim()) {
      showNotification("You must establish or join a room first!", "error");
      return;
    }

    socket.emit("add-to-queue", {
      roomId: roomId.trim(),
      song: {
        videoId: video.id.videoId,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.default.url,
      },
    });
    showNotification("Added track to shared room playlist");
  };

  const removeSongFromQueue = (index) => {
    if (!roomId.trim()) return;
    socket.emit("remove-from-queue", { roomId: roomId.trim(), index });
    showNotification("Track dropped from playlist", "error");
  };

  const playSong = (song) => {
    if (!roomId.trim()) return;
    setVideoId(song.videoId);
    socket.emit("change-video", { roomId: roomId.trim(), videoId: song.videoId });
  };

  const handleBroadcastPlay = () => {
    if (!roomId.trim()) return;
    socket.emit("play", roomId.trim());
  };
  
  const handleBroadcastPause = () => {
    if (!roomId.trim()) return;
    socket.emit("pause", roomId.trim());
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-400 relative">
      
      {/* GLOWING POP-UP TOAST NOTIFICATION CONTAINER HUB */}
      {toast.visible && (
        <div className="fixed top-6 right-6 z-[100] animate-fadeIn">
          <div className={`backdrop-blur-xl border px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm transition-all duration-300 ${
            toast.type === "error" 
              ? "bg-red-950/80 border-red-500/30 text-red-200 shadow-red-500/5" 
              : "bg-emerald-950/80 border-emerald-500/30 text-emerald-200 shadow-emerald-500/5"
          }`}>
            <div className={`w-2 h-2 rounded-full ${toast.type === "error" ? "bg-red-400" : "bg-emerald-400 animate-pulse"}`}></div>
            <span className="text-xs font-semibold tracking-wide leading-relaxed">{toast.message}</span>
          </div>
        </div>
      )}

      {/* RENDER VIEW CONTEXT SPLITTER */}
      {!token ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0f1524]/60 border border-slate-800/80 p-8 rounded-3xl shadow-2xl backdrop-blur-md">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent mb-1">
                {isRegistering ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-xs text-slate-400">
                {isRegistering ? "Sign up to start sharing synchronous playlists" : "Log in to join your shared sync music rooms"}
              </p>
            </div>

            <form onSubmit={isRegistering ? handleSignup : handleLogin} className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="john_doe"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    required
                    className="w-full bg-[#05070d] border border-slate-700/60 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                  className="w-full bg-[#05070d] border border-slate-700/60 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                  className="w-full bg-[#05070d] border border-slate-700/60 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-opacity hover:opacity-95 shadow-lg pt-3"
              >
                {isRegistering ? "Register Account" : "Sign In"}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors underline bg-transparent border-none outline-none cursor-pointer"
              >
                {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Register Here"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Global Navigation Header View */}
          <header className="border-b border-slate-800 bg-[#0f1524]/80 px-6 py-4 flex items-center justify-between shadow-md shrink-0">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent flex items-center gap-2">
              <span>🎵</span> MusicRoom Sync
            </h1>
            
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <input
                  placeholder="Enter Room ID Key..."
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="bg-[#05070d] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <button 
                  onClick={joinRoom} 
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition-all uppercase tracking-wide shadow-md active:scale-95"
                >
                  Join Room
                </button>
              </div>

              <div className="h-6 w-[1px] bg-slate-800"></div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">User: <strong className="text-slate-200 font-semibold">{username}</strong></span>
                <button
                  onClick={handleLogout}
                  className="bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-900/60 text-slate-300 hover:text-red-400 px-3 py-1.5 rounded-lg text-xs transition-all tracking-wide active:scale-95"
                >
                  Log Out
                </button>
              </div>
            </div>
          </header>

          {/* Main Grid Interactive Canvas Layout */}
          <main className="flex-1 max-w-[1500px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* PANEL LEFT: SEARCH CRADLE */}
            <div className="lg:col-span-3 flex flex-col gap-6">
              <div className="bg-[#121a2e]/40 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-full">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <span className="w-1 h-2 bg-emerald-400 rounded-full"></span>
                  Search Shared Songs
                </h2>
                <div className="flex gap-2 mb-3">
                  <input
                    placeholder="Search catalog titles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchSongs()}
                    className="flex-1 bg-[#05070d] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button onClick={searchSongs} className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-2 rounded-xl text-xs uppercase shrink-0">
                    Find
                  </button>
                </div>

                {results.length > 0 && (
                  <div className="max-h-[380px] overflow-y-auto bg-[#05070d]/60 rounded-xl border border-slate-800 p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                    {results.map((video) => (
                      <div key={video.id.videoId} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-900/40 transition-colors group">
                        <img src={video.snippet.thumbnails.default.url} className="w-10 h-8 object-cover rounded shadow shrink-0" alt="thumb" />
                        <div className="truncate flex-1">
                          <p className="text-[11px] font-medium text-slate-300 group-hover:text-emerald-400 truncate">{video.snippet.title}</p>
                        </div>
                        <button 
                          onClick={() => addSongToQueue(video)} 
                          className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 font-bold px-2 py-1 rounded text-[9px] uppercase shrink-0"
                        >
                          + Q
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* PANEL CENTER: PLAYER MATRIX WINDOW */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              <div className="bg-[#121a2e]/30 border border-slate-800/60 rounded-3xl p-5 shadow-2xl flex flex-col justify-between items-center flex-1 min-h-[380px]">
                <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-slate-900 bg-black flex items-center justify-center relative">
                  {videoId ? (
                    <div className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:rounded-xl">
                      <YouTube
                        videoId={videoId}
                        className="w-full h-full"
                        containerClassName="w-full h-full"
                        opts={{ playerVars: { controls: 1, autoplay: 1 } }}
                        onReady={(event) => {
                          playerRef.current = event.target;
                          if (roomState && roomState.currentTime > 0) {
                            playerRef.current.seekTo(roomState.currentTime, true);
                            if (roomState.isPlaying) playerRef.current.playVideo();
                          }
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 uppercase tracking-widest font-mono p-6 text-center">
                      Monitor Screen Standby.
                    </p>
                  )}
                </div>

                {videoId && (
                  <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-800 p-2.5 rounded-xl mt-4 shadow-inner">
                    <button onClick={handleBroadcastPause} className="bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide text-slate-300 transition-colors">
                      ⏸ Pause Sync
                    </button>
                    <button onClick={handleBroadcastPlay} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-opacity hover:opacity-90">
                      ▶ Play Sync
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* PANEL RIGHT: QUEUE TRACKER AND CHAT FEED COMPONENT LINK */}
            <div className="lg:col-span-3 flex flex-col gap-5 justify-between">
              <div className="bg-[#121a2e]/20 border border-slate-800 rounded-2xl p-3 shadow-xl h-[160px] overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-slate-900">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">🎶 Playlist Queue ({queue.length})</h3>
                <div className="space-y-1.5 flex-1">
                  {queue.length === 0 ? (
                    <p className="text-[10px] text-slate-600 italic text-center py-4">Queue is empty</p>
                  ) : (
                    queue.map((song, index) => (
                      <div key={index} className="flex items-center justify-between gap-2 p-1 rounded bg-slate-950/30 border border-slate-900/40">
                        <span className="text-[11px] text-slate-300 truncate font-medium flex-1 px-1">{song.title}</span>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => playSong(song)} className="text-emerald-400 font-bold hover:text-emerald-300 text-[10px] uppercase">Play</button>
                          <button onClick={() => removeSongFromQueue(index)} className="text-red-400 font-bold hover:text-red-300 text-[10px] uppercase font-mono px-0.5">✕</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex-1">
                <Chat roomId={roomId.trim()} showNotification={showNotification} />
              </div>
            </div>

          </main>
        </>
      )}
    </div>
  );
}

export default App;