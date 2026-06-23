// sockets/roomSocket.js
const redisClient = require("../config/redis"); // Import the centralized Redis Client

const roomSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // Helper to construct a consistent Redis key prefix
    const getRoomKey = (roomId) => `room:${roomId}`;

    // Pure helper function that doesn't overwrite outer variables
    const extractRoomId = (payload) => {
      if (typeof payload === "object" && payload !== null) {
        return payload.roomId;
      }
      return payload;
    };

    // Helper to abstract fetching and parsing data safely from Redis Cloud
    const getRoomState = async (roomId) => {
      const data = await redisClient.get(getRoomKey(roomId));
      return data ? JSON.parse(data) : null;
    };

    // Helper to abstract saving structured data back to Redis Cloud
    const setRoomState = async (roomId, state) => {
      await redisClient.set(getRoomKey(roomId), JSON.stringify(state));
    };

    // Join Room
    socket.on("join-room", async (data) => {
      const roomId = extractRoomId(data);
      if (!roomId) return;

      socket.join(roomId);

      let currentState = await getRoomState(roomId);

      // If room snapshot doesn't exist yet, initialize it in Redis Cloud
      if (!currentState) {
        currentState = {
          videoId: "",
          playState: "paused",
          currentTime: 0,
          queue: [],
        };
        await setRoomState(roomId, currentState);
      }

      // Send the current snapshot state exclusively to the user who just joined
      socket.emit("room-state", currentState);

      // Explicitly trigger a track change for the new user if music is already playing in this room
      if (currentState.videoId) {
        socket.emit("video-changed", currentState.videoId);
      }
      
      console.log(`User ${socket.user.username} joined room: ${roomId}`);
    });

    // Play Sync
    socket.on("play", async (data) => {
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = await getRoomState(roomId);
      if (state) {
        state.playState = "playing";
        await setRoomState(roomId, state);
      }

      io.to(roomId).emit("play");
    });

    // Pause Sync
    socket.on("pause", async (data) => {
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = await getRoomState(roomId);
      if (state) {
        state.playState = "paused";
        await setRoomState(roomId, state);
      }

      io.to(roomId).emit("pause");
    });

    // Time Update
    socket.on("time-update", async (data) => {
      if (!data) return;
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = await getRoomState(roomId);
      if (state) {
        state.currentTime = data.currentTime;
        await setRoomState(roomId, state);
      }
    });

    // Change Video / Play Track
    socket.on("change-video", async (data) => {
      if (!data) return;
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = await getRoomState(roomId);
      if (state) {
        state.videoId = data.videoId;
        state.currentTime = 0;
        state.playState = "playing";
        await setRoomState(roomId, state);
      }

      io.to(roomId).emit("video-changed", data.videoId);
    });

    // Add Queue
    socket.on("add-to-queue", async (data) => {
      if (!data || !data.song) return;
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = await getRoomState(roomId);
      if (state) {
        state.queue.push(data.song);
        await setRoomState(roomId, state);
        
        // Broadcast the updated queue array back to everyone in the room
        io.to(roomId).emit("queue-updated", state.queue);
      }
    });

    // Remove Queue
    socket.on("remove-from-queue", async (data) => {
      if (!data) return;
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const state = await getRoomState(roomId);
      if (state) {
        state.queue.splice(data.index, 1);
        await setRoomState(roomId, state);
        
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