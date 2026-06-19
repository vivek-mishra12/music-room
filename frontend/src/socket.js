import { io } from "socket.io-client";

// Secure Render Deployment Base Target URL
const SOCKET_URL = "http://localhost:5000";

const socket = io(SOCKET_URL, {
  autoConnect: true,
  // Forces secure encrypted connections (WSS) matching Vercel's context safety rules
  transports: ["websocket", "polling"], 
  secure: true,
  rejectUnauthorized: false
});

export default socket;