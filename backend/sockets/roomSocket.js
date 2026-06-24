// backend/sockets/roomSocket.js
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

    // Helper to emit the updated participant count to a room
    const broadcastUserCount = (roomId) => {
      if (!roomId) return;
      const userCount = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      io.to(roomId).emit("user-count-changed", { count: userCount });
      console.log(`Broadcasted active count for room ${roomId}: ${userCount}`);
    };

    // Join Room
    socket.on("join-room", async (data) => {
      const roomId = extractRoomId(data);
      if (!roomId) return;

      const oldRoomId = socket.currentRoomId;

      // If switching rooms, explicitly leave the old room first
      if (oldRoomId && oldRoomId !== roomId) {
        socket.leave(oldRoomId);
        broadcastUserCount(oldRoomId); // Update remaining users in the old room
      }

      // FIXED: Await the asynchronous room joining process before reading the adapter size
      await socket.join(roomId);
      socket.currentRoomId = roomId; // Track the room ID on the socket instance

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

      // Broadcast the updated user count to everyone in the room (now reflects the accurate count)
      broadcastUserCount(roomId);

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
      socket.to(roomId).emit("room-time-sync", { currentTime: data.currentTime });
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
      if (!data || !data.message) return;
      
      const targetRoomId = socket.currentRoomId;
      if (!targetRoomId) return;

      io.to(targetRoomId).emit("chat-message", {
        sender: socket.user.username,
        text: data.message,
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.username}`);
      
      // If the user was in a room, update and notify remaining room members
      if (socket.currentRoomId) {
        broadcastUserCount(socket.currentRoomId);
      }
    });
  });
};

module.exports = roomSocket;