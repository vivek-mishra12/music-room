import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Authentication Context
  token: localStorage.getItem("token") || "",
  username: localStorage.getItem("username") || "",
  
  // Active Sync Room State
  roomId: "",
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
      state.token = "";
      state.username = "";
      state.roomId = "";
      state.videoId = "";
      state.isPlaying = false;
      state.joinedUsersCount = 0;
      state.queue = [];
      state.roomState = null;
      localStorage.removeItem("token");
      localStorage.removeItem("username");
    },
    setRoomId: (state, action) => {
      state.roomId = action.payload;
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
  setRoomId,
  setVideoId,
  setIsPlaying,
  setJoinedUsersCount,
  setQueue,
  setRoomState,
} = roomSlice.actions;

export default roomSlice.reducer;