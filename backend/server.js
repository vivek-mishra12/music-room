const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios"); // For routing proxy requests to Google's YouTube Data API
const User = require("./models/User");

require("dotenv").config();

const app = express();

// Essential parsing middleware layers
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Dynamic Cross-Origin Resource Sharing Rules Configuration
app.use(cors({
  origin: ["https://music-room-umber.vercel.app"], 
  credentials: true
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch(err => console.log("DB Connection Error:", err));

// --- AUTHENTICATION ROUTES ---

// Signup Registration Endpoint
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    let userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login Authorization Token Generation Endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, username: user.username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- YOUTUBE API PROXY SEARCH ROUTE ---
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ message: "Search query string configuration required" });
  }

  try {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; 
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${YOUTUBE_API_KEY}`;
    
    const response = await axios.get(url);
    res.json(response.data.items);
  } catch (error) {
    console.error("YouTube API Gateway Error Detail:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch search catalog data frames from YouTube engine" });
  }
});

// Create Node HTTP instance wrapping our Express routing stack
const server = http.createServer(app);

// Initialize Socket.io instance on top of shared HTTP channel server hooks
const io = new Server(server, {
  cors: {
    origin: ["https://music-room-umber.vercel.app"],
    methods: ["GET", "POST"]
  }
});

// --- SOCKET.IO SECURE AUTH HANDSHAKE MIDDLEWARE ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: Token payload missing"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Bind decoded identity payload directly to active transient connection
    next();
  } catch (err) {
    return next(new Error("Authentication error: Stale or Invalid Signature Token"));
  }
});

// Rooms state memory map schema orchestration container
const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user.username} (${socket.id})`);

  // Room Orchestration lifecycle routing logic
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    
    // Create new blank room data signature layout map structure if nonexistent
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { videoId: "", playState: "paused", currentTime: 0, queue: [] });
    }
    
    // Broadcast active synchronized snapshot state array to connecting user payload
    socket.emit("room-state", rooms.get(roomId));
  });

  // Handle Synchronized Play status broadcast updates across active channels
  socket.on("play", (roomId) => {
    const state = rooms.get(roomId);
    if (state) {
      state.playState = "playing";
    }
    // Changed to io.to(roomId) to ensure sync updates sync across all active browser frames/tabs simultaneously
    io.to(roomId).emit("play");
  });

  // Handle Synchronized Pause status broadcast updates across active channels
  socket.on("pause", (roomId) => {
    const state = rooms.get(roomId);
    if (state) {
      state.playState = "paused";
    }
    // Changed to io.to(roomId) to keep execution pointers locked synchronously across tabs
    io.to(roomId).emit("pause");
  });

  // Handle Real-time Synchronized Video Playback Seek updates 
  socket.on("time-update", ({ roomId, currentTime }) => {
    const state = rooms.get(roomId);
    if (state) {
      state.currentTime = currentTime;
    }
  });

  // Handle Global Active Song Catalog mutations inside the playlist room
  socket.on("change-video", ({ roomId, videoId }) => {
    const state = rooms.get(roomId);
    if (state) {
      state.videoId = videoId;
      state.currentTime = 0; // Reset workspace layout timelines
    }
    // Changed to io.to(roomId) to instantly update alternative view streams
    io.to(roomId).emit("video-changed", videoId);
  });

  // Queue modification mechanics: Add Track Item Elements
  socket.on("add-to-queue", ({ roomId, song }) => {
    const state = rooms.get(roomId);
    if (state) {
      if (!state.queue) state.queue = [];
      state.queue.push(song);
      io.to(roomId).emit("queue-updated", state.queue);
    }
  });

  // Queue modification mechanics: Delete Track Item Elements by Array positions
  socket.on("remove-from-queue", ({ roomId, index }) => {
    const state = rooms.get(roomId);
    if (state && state.queue) {
      state.queue.splice(index, 1);
      io.to(roomId).emit("queue-updated", state.queue);
    }
  });

  // Handle Secure Real-time chat streaming message relays
  socket.on("chat-message", ({ roomId, message }) => {
    if (!roomId) return;
    io.to(roomId).emit("chat-message", { sender: socket.user.username, text: message });
  });

  // Disconnection Lifecycle listener pipeline cleanup
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.user.username}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server handling orchestration on port ${PORT}`));