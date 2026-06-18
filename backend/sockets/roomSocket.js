// sockets/roomSocket.js

const rooms = new Map();

const roomSocket = (io) => {

  io.on("connection", (socket) => {

    console.log(
      `User connected: ${socket.user.username} (${socket.id})`
    );

    // Join Room
    socket.on("join-room", (roomId) => {

      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          videoId: "",
          playState: "paused",
          currentTime: 0,
          queue: [],
        });
      }

      socket.emit(
        "room-state",
        rooms.get(roomId)
      );
    });

    // Play
    socket.on("play", (roomId) => {

      const state = rooms.get(roomId);

      if (state) {
        state.playState = "playing";
      }

      io.to(roomId).emit("play");
    });

    // Pause
    socket.on("pause", (roomId) => {

      const state = rooms.get(roomId);

      if (state) {
        state.playState = "paused";
      }

      io.to(roomId).emit("pause");
    });

    // Time Update
    socket.on(
      "time-update",
      ({ roomId, currentTime }) => {

        const state = rooms.get(roomId);

        if (state) {
          state.currentTime = currentTime;
        }
      }
    );

    // Change Video
    socket.on(
      "change-video",
      ({ roomId, videoId }) => {

        const state = rooms.get(roomId);

        if (state) {
          state.videoId = videoId;
          state.currentTime = 0;
        }

        io.to(roomId).emit(
          "video-changed",
          videoId
        );
      }
    );

    // Add Queue
    socket.on(
      "add-to-queue",
      ({ roomId, song }) => {

        const state = rooms.get(roomId);

        if (state) {
          state.queue.push(song);

          io.to(roomId).emit(
            "queue-updated",
            state.queue
          );
        }
      }
    );

    // Remove Queue
    socket.on(
      "remove-from-queue",
      ({ roomId, index }) => {

        const state = rooms.get(roomId);

        if (state) {
          state.queue.splice(index, 1);

          io.to(roomId).emit(
            "queue-updated",
            state.queue
          );
        }
      }
    );

    // Chat Message
    socket.on(
      "chat-message",
      ({ roomId, message }) => {

        io.to(roomId).emit(
          "chat-message",
          {
            sender: socket.user.username,
            text: message,
          }
        );
      }
    );

    // Disconnect
    socket.on("disconnect", () => {

      console.log(
        `User disconnected: ${socket.user.username}`
      );
    });

  });
};

module.exports = roomSocket;