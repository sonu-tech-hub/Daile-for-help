const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth');
const { validateMessage } = require('../middleware/validation');
const { uploadDocuments } = require('../config/cloudinary');

// All routes are protected
router.post(
  '/',
  verifyToken,
  uploadDocuments.single('media'),
  validateMessage,
  messageController.sendMessage
);

router.get('/conversations', verifyToken, messageController.getConversationList);
router.get('/conversation/:otherUserId', verifyToken, messageController.getConversation);
router.get('/unread-count', verifyToken, messageController.getUnreadCount);
router.put('/read/:otherUserId', verifyToken, messageController.markAsRead);

module.exports = router;
