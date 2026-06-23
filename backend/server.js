require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter"); // Import Redis Adapter
const redisClient = require("./config/redis"); // Import your Redis Client configuration
const connectDB = require("./config/db");
const bcrypt = require("bcryptjs");
const socketAuth = require("./middleware/socketAuth");
const axios = require("axios"); // For routing proxy requests to Google's YouTube Data API
const User = require("./models/User");
const youtubeRoutes = require("./routes/youtubeRoutes");
const roomSocket = require("./sockets/roomSocket");
const authRoutes = require("./routes/authRoutes");
const geminiRoutes = require("./routes/geminiRoutes"); // 1. Import routes

connectDB();

const app = express();

// Essential parsing middleware layers
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Dynamic Cross-Origin Resource Sharing Rules Configuration
app.use(cors({
  origin: ["https://music-room-umber.vercel.app"], 
  credentials: true
}));

// --- AUTHENTICATION ROUTES ---

// Signup Registration and login Endpoint
app.use("/api/auth", authRoutes);

// --- YOUTUBE API PROXY SEARCH ROUTE ---
app.use("/api/youtube", youtubeRoutes);

app.use("/api/gemini", geminiRoutes); // 2. Bind middleware

// Create Node HTTP instance wrapping our Express routing stack
const server = http.createServer(app);

// Initialize Socket.io instance on top of shared HTTP channel server hooks
const io = new Server(server, {
  cors: {
    origin: ["https://music-room-umber.vercel.app"],
    methods: ["GET", "POST"]
  }
});

// --- SOCKET.IO REDIS ADAPTER CONNECTION ---
// Socket.io requires separate duplication of connections for pub/sub operations
const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Socket.io Redis Cloud Adapter attached successfully.");
  })
  .catch((err) => {
    console.error("Failed to attach Socket.io Redis Adapter:", err);
  });

// --- SOCKET.IO SECURE AUTH HANDSHAKE MIDDLEWARE ---
io.use(socketAuth);
roomSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server handling orchestration on port ${PORT}`));