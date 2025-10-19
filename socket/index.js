const Message = require('../models/Message');
const jwt = require('jsonwebtoken')

module.exports = (io) => {
  const connectedUsers = new Map();

  io.use((socket, next) => {

    try {
      const token = socket.handshake.auth?.token;

      if (!token) return next(new Error('Authentication error - token does not exist'));
      console.log('before decoded')
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('after decoded')
      socket.userId = decoded.user.id;
      next();
    } catch (err) {
      next(new Error('Authentication error: Catch'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    connectedUsers.set(socket.userId, socket.id);
    socket.join(socket.userId);

    socket.on('sendMessage', async ({ to, content, roomId }) => {
      if (!content) return;

      const from = socket.userId;
      const msg = await Message.create({
        from,
        to: to || null,
        roomId: roomId || null,
        content,
        status: 'sent'
      });

      const payload = {
        _id: msg._id,
        from: msg.from,
        to: msg.to,
        roomId: msg.roomId,
        content: msg.content,
        createdAt: msg.createdAt,
        status: msg.status
      };

      // Emit to recipient if online
      if (to && connectedUsers.has(to)) {
        io.to(connectedUsers.get(to)).emit('message', payload);
      }

      // Emit back to sender
      socket.emit('message', payload);
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.userId);
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};
