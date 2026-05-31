const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

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

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        videoId: "",
        isPlaying: false,
        currentTime: 0,
      };
    }

    console.log("JOIN ROOM STATE:", rooms[roomId]);

    socket.emit("room-state", rooms[roomId]);

    console.log(`${socket.id} joined ${roomId}`);
  });

  socket.on("change-video", ({ roomId, videoId }) => {
    if (!rooms[roomId]) return;

    console.log("Before Change:", rooms[roomId]);

    rooms[roomId].videoId = videoId;
    rooms[roomId].currentTime = 0;

    console.log("After Change:", rooms[roomId]);

    io.to(roomId).emit("video-changed", videoId);
  });

  socket.on("play", (roomId) => {
    if (!rooms[roomId]) return;

    rooms[roomId].isPlaying = true;

    io.to(roomId).emit("play");
  });

  socket.on("pause", (roomId) => {
    if (!rooms[roomId]) return;

    rooms[roomId].isPlaying = false;

    io.to(roomId).emit("pause");
  });

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
  console.log(
    "ROOMS:",
    JSON.stringify(rooms, null, 2)
  );
}, 5000);

server.listen(5000, () => {
  console.log("Server Running on Port 5000");
});