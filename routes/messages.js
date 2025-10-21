// routes/messages.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');

// GET /api/messages?roomId=...&limit=50&before=...
// or GET /api/messages?userA=...&userB=... to fetch 1:1 conversation
router.get('/', auth, async (req, res) => {
  try {
    const { roomId, userA, userB, limit = 50, before } = req.query;
    let beforeDate = before ? new Date(before) : undefined;

    let messages;
    if (roomId) {
      messages = await Message.fetchConversation({ roomId, limit, before: beforeDate });
    } else if (userA && userB) {
      // Ensure requester is either userA or userB
      if (![userA, userB].includes(req.user.id)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      messages = await Message.fetchConversation({ userA, userB, limit, before: beforeDate });
    } else {
      return res.status(400).json({ message: 'roomId or userA+userB required' });
    }

    res.json({ messages });
  } catch (err) {
    console.error('GET /api/messages error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/messages/:id/read -> mark as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // Optional: verify requester is recipient or a room participant
    msg.status = 'read';
    await msg.save();
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error('PATCH /api/messages/:id/read', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;