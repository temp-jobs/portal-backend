const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// GET /chats/user
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware

    // 1️⃣ Find all chats where user is a participant
    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'name')  // get participant names
      .populate('job', 'title')
      .lean();

    // 2️⃣ Build chat previews
    const chatPreviews = await Promise.all(
      chats.map(async (chat) => {
        // partner is the other user
        const partner = chat.participants.find(p => p._id.toString() !== userId.toString());
        let partnerNewName = ''

        if (partner?.role === 'jobseeker') {
          partnerNewName = partner?.name;
        } else if (partner?.role === 'employer') {
          partnerNewName = partner?.companyName;
        }

        // last message
        const lastMsg = await Message.find({ roomId: chat._id })
          .sort({ createdAt: -1 })
          .limit(1)
          .lean();

        const unreadCount = await Message.countDocuments({
          roomId: chat._id,
          to: userId,
          status: { $ne: 'read' },
        });

        return {
          _id: chat._id,
          chatId: chat._id,
          partnerId: partner?._id,
          partnerName: partnerNewName || 'Unknown',
          jobTitle: chat.job?.title || 'Unknown',
          lastMessage: lastMsg[0]?.content || '',
          timestamp: lastMsg[0]?.createdAt || chat.createdAt,
          unreadCount,
        };
      })
    );

    res.json(chatPreviews);
  } catch (err) {
    console.error('Fetch user chats error:', err);
    res.status(500).json({ message: 'Failed to fetch chats' });
  }
});

module.exports = router;
