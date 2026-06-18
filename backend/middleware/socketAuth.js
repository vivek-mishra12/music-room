// middleware/socketAuth.js

const jwt = require("jsonwebtoken");

const socketAuth = (socket, next) => {
  const token = socket.handshake.auth.token;

  // Check if token exists
  if (!token) {
    return next(
      new Error("Authentication error: Token missing")
    );
  }

  try {
    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Attach user info to socket
    socket.user = decoded;

    next();
  } catch (error) {
    next(
      new Error("Authentication error: Invalid token")
    );
  }
};

module.exports = socketAuth;