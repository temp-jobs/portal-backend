const jwt = require('jsonwebtoken');
const User = require('../models/User');

const connectedUsers = new Map(); // userId => socket.id

module.exports = (io) => {
  // Middleware for authenticating each socket connection
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        console.warn('❌ Socket connection rejected: No token provided');
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.user.id;
      next();
    } catch (err) {
      console.error('❌ Socket authentication failed:', err.message);
      next(new Error('Authentication error'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);

    // Track connected user
    connectedUsers.set(socket.userId, socket.id);
    socket.join(socket.userId);

    // Handle messages
    socket.on('sendMessage', async ({ to, content }) => {
      if (!to || !content) return;
      const from = socket.userId;

      // Optional: persist message in DB here

      const payload = {
        from,
        to,
        content,
        createdAt: new Date(),
      };

      // Send message to receiver (if online)
      const receiverSocketId = connectedUsers.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message', payload);
      }

      // Also emit back to sender (confirmation)
      socket.emit('message', payload);
    });

    // Clean up when user disconnects
    socket.on('disconnect', (reason) => {
      console.log(`⚠️ User disconnected: ${socket.userId} (${reason})`);
      connectedUsers.delete(socket.userId);
    });
  });

  // Optional: Handle server restarts / namespace errors
  io.engine.on('connection_error', (err) => {
    console.error('🚨 Socket.IO connection error:', err.message);
  });
};
