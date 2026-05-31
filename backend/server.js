const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

require("dotenv").config();

const axios = require("axios");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // JOIN ROOM
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        videoId: "",
        isPlaying: false,
        currentTime: 0,
        queue: [],
      };
    }

    socket.emit("room-state", {
      videoId: rooms[roomId].videoId,
      isPlaying: rooms[roomId].isPlaying,
      currentTime: rooms[roomId].currentTime,
      queue: rooms[roomId].queue,
    });

    console.log(`${socket.id} joined ${roomId}`);
  });

  // REALTIME CHAT RESPONSE HANDLER
  socket.on("chat-message", ({ roomId, msg }) => {
    if (!roomId) return;
    
    // Broadcast the message structure securely to everyone inside the targeted room
    io.to(roomId).emit("incoming-message", {
      id: socket.id,
      text: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // CHANGE VIDEO
  socket.on("change-video", ({ roomId, videoId }) => {
    if (!rooms[roomId]) return;

    rooms[roomId].videoId = videoId;
    rooms[roomId].currentTime = 0;

    io.to(roomId).emit("video-changed", videoId);
  });

  // ADD TO QUEUE
  socket.on("add-to-queue", ({ roomId, song }) => {
    if (!rooms[roomId]) return;

    rooms[roomId].queue.push(song);

    console.log("QUEUE:", rooms[roomId].queue);

    io.to(roomId).emit("queue-updated", rooms[roomId].queue);
  });

  // REMOVE FROM QUEUE
  socket.on("remove-from-queue", ({ roomId, index }) => {
    if (!rooms[roomId] || !rooms[roomId].queue[index]) return;

    rooms[roomId].queue.splice(index, 1);

    console.log(`REMOVED item at index ${index} from room ${roomId}`);

    io.to(roomId).emit("queue-updated", rooms[roomId].queue);
  });

  // PLAY
  socket.on("play", (roomId) => {
    if (!rooms[roomId]) return;

    rooms[roomId].isPlaying = true;

    io.to(roomId).emit("play");
  });

  // PAUSE
  socket.on("pause", (roomId) => {
    if (!rooms[roomId]) return;

    rooms[roomId].isPlaying = false;

    io.to(roomId).emit("pause");
  });

  // TIME UPDATE
  socket.on("time-update", ({ roomId, currentTime }) => {
    if (!rooms[roomId]) return;

    rooms[roomId].currentTime = currentTime;
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

// DEBUG
setInterval(() => {
  console.log("ROOMS:", JSON.stringify(rooms, null, 2));
}, 5000);

// SEARCH API
app.get("/search", async (req, res) => {
  try {
    const query = req.query.q;

    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: query,
          maxResults: 10,
          type: "video",
          key: process.env.YOUTUBE_API_KEY,
        },
      }
    );

    res.json(response.data.items);
  } catch (err) {
    console.log(err.message);

    res.status(500).json({
      message: "Search Failed",
    });
  }
});

server.listen(5000, () => {
  console.log("Server Running on Port 5000");
});