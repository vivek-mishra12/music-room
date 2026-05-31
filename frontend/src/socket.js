import { io } from "socket.io-client";

const socket = io(
  "https://music-room-1-ocnj.onrender.com"
);

export default socket;