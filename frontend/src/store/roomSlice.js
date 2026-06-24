// frontend/src/store/roomSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  token: localStorage.getItem("token") || "",
  username: localStorage.getItem("username") || "",
  
  roomInput: "",      // Tracks what the user types in the box
  activeRoomId: "",   // Tracks the room the user is ACTUALLY joined in
  videoId: "",
  isPlaying: false,
  joinedUsersCount: 0,
  queue: [],
  roomState: null,
};

const roomSlice = createSlice({
  name: "room",
  initialState,
  reducers: {
    setAuth: (state, action) => {
      state.token = action.payload.token;
      state.username = action.payload.username;
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("username", action.payload.username);
    },
    clearAuth: (state) => {
      return { ...initialState, token: "", username: "" };
    },
    setRoomInput: (state, action) => {
      state.roomInput = action.payload;
    },
    setActiveRoomId: (state, action) => {
      state.activeRoomId = action.payload;
    },
    setVideoId: (state, action) => {
      state.videoId = action.payload;
    },
    setIsPlaying: (state, action) => {
      state.isPlaying = action.payload;
    },
    setJoinedUsersCount: (state, action) => {
      state.joinedUsersCount = action.payload;
    },
    setQueue: (state, action) => {
      state.queue = action.payload;
    },
    setRoomState: (state, action) => {
      state.roomState = action.payload;
      if (action.payload?.videoId) state.videoId = action.payload.videoId;
      if (action.payload?.queue) state.queue = action.payload.queue;
    },
  },
});

export const {
  setAuth,
  clearAuth,
  setRoomInput,
  setActiveRoomId,
  setVideoId,
  setIsPlaying,
  setJoinedUsersCount,
  setQueue,
  setRoomState,
} = roomSlice.actions;

export default roomSlice.reducer;