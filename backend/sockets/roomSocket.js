// sockets/roomSocket.js

const rooms = new Map();

const roomSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Pure helper function that doesn't overwrite outer variables
    const extractRoomId = (payload) => {
      if (typeof payload === "object" && payload !== null) {
        return payload.roomId;
      }
      return payload;
    };

    // Join Room
    socket.on("join-room", (data) => {
      const roomId = extractRoomId(data);
      if (!roomId) return;

      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          videoId: "",
          playState: "paused",
          currentTime: 0,
          queue: [],
        });
      }

      const currentState = rooms.get(roomId);

      // Send the current snapshot state exclusively to the user who just joined
      socket.emit("room-state", currentState);

      // Explicitly trigger a track change for the new user if music is already playing in this room
      if (currentState.videoId) {
        socket.emit("video-changed", currentState.videoId);
      }
      
      console.log(`User ${socket.user.username} joined room: ${roomId}`);
    });

    // Play Sync
    socket.on("play", (data) => {
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = rooms.get(roomId);
      if (state) {
        state.playState = "playing";
      }

      io.to(roomId).emit("play");
    });

    // Pause Sync
    socket.on("pause", (data) => {
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = rooms.get(roomId);
      if (state) {
        state.playState = "paused";
      }

      io.to(roomId).emit("pause");
    });

    // Time Update
    socket.on("time-update", (data) => {
      if (!data) return;
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = rooms.get(roomId);
      if (state) {
        state.currentTime = data.currentTime;
      }
    });

    // Change Video / Play Track
    socket.on("change-video", (data) => {
      if (!data) return;
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = rooms.get(roomId);
      if (state) {
        state.videoId = data.videoId;
        state.currentTime = 0;
        state.playState = "playing";
      }

      io.to(roomId).emit("video-changed", data.videoId);
    });

    // Add Queue
    socket.on("add-to-queue", (data) => {
      if (!data || !data.song) return;
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = rooms.get(roomId);
      if (state) {
        state.queue.push(data.song);
        // Broadcast the updated queue array back to everyone in the room
        io.to(roomId).emit("queue-updated", state.queue);
      }
    });

    // Remove Queue
    socket.on("remove-from-queue", (data) => {
      if (!data) return;
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = rooms.get(roomId);
      if (state) {
        state.queue.splice(data.index, 1);
        io.to(roomId).emit("queue-updated", state.queue);
      }
    });

    // Chat Message
    socket.on("chat-message", (data) => {
      if (!data) return;
      const roomId = extractRoomId(data);
      if (!roomId) return;

      io.to(roomId).emit("chat-message", {
        sender: socket.user.username,
        text: data.message,
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.username}`);
    });
  });
};

module.exports = roomSocket;