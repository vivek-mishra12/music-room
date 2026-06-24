import { configureStore } from "@reduxjs/toolkit";
import roomReducer from "./roomSlice";

export const store = configureStore({
  reducer: {
    room: roomReducer,
  },
  // Adding middleware configs if you plan to bypass serializable checks for complex socket objects later
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});