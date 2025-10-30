const { promisePool } = require('../config/database');
const { uploadToCloudinary } = require('../config/cloudinary');
const { paginate } = require('../utils/helpers');

// Send message
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiver_id, message_text, job_id } = req.body;
    
    // Check if receiver exists
    const [receivers] = await promisePool.query(
      'SELECT id FROM users WHERE id = ? AND is_active = TRUE',
      [receiver_id]
    );
    
    if (receivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }
    
    // Upload media if provided
    let mediaUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'messages');
      mediaUrl = result.secure_url;
    }
    
    // Insert message
    const [result] = await promisePool.query(
      `INSERT INTO messages (sender_id, receiver_id, job_id, message_text, media_url)
       VALUES (?, ?, ?, ?, ?)`,
      [senderId, receiver_id, job_id || null, message_text, mediaUrl]
    );
    
    // Create notification for receiver
    await promisePool.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [receiver_id, 'New Message', message_text.substring(0, 100), 'system', result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message_id: result.insertId,
        media_url: mediaUrl
      }
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

// Get conversation with a user
const getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const { limit: limitNum, offset } = paginate(page, limit);
    
    const [messages] = await promisePool.query(
      `SELECT 
        m.*,
        s.email as sender_email,
        CASE 
          WHEN wp.user_id IS NOT NULL THEN wp.full_name
          WHEN sp.user_id IS NOT NULL THEN sp.full_name
          ELSE 'User'
        END as sender_name
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      LEFT JOIN worker_profiles wp ON wp.user_id = s.id
      LEFT JOIN seeker_profiles sp ON sp.user_id = s.id
      WHERE 
        (m.sender_id = ? AND m.receiver_id = ?) OR
        (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, otherUserId, otherUserId, userId, limitNum, offset]
    );
    
    // Mark messages as read
    await promisePool.query(
      'UPDATE messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ?',
      [userId, otherUserId]
    );
    
    // Get total count
    const [countResult] = await promisePool.query(
      `SELECT COUNT(*) as total FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
      [userId, otherUserId, otherUserId, userId]
    );
    
    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total: countResult[0].total,
          total_pages: Math.ceil(countResult[0].total / limitNum)
        }
      }
    });
    
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversation'
    });
  }
};

// Get all conversations (chat list)
const getConversationList = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [conversations] = await promisePool.query(
      `SELECT DISTINCT
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END as other_user_id,
        CASE 
          WHEN m.sender_id = ? THEN 
            COALESCE(wp_r.full_name, sp_r.full_name, 'User')
          ELSE 
            COALESCE(wp_s.full_name, sp_s.full_name, 'User')
        END as other_user_name,
        CASE 
          WHEN m.sender_id = ? THEN 
            COALESCE(wp_r.profile_photo, sp_r.profile_photo)
          ELSE 
            COALESCE(wp_s.profile_photo, sp_s.profile_photo)
        END as other_user_photo,
        (SELECT message_text FROM messages 
         WHERE (sender_id = ? AND receiver_id = other_user_id) 
            OR (sender_id = other_user_id AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages 
         WHERE (sender_id = ? AND receiver_id = other_user_id) 
            OR (sender_id = other_user_id AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages 
         WHERE sender_id = other_user_id AND receiver_id = ? AND is_read = FALSE) as unread_count
      FROM messages m
      LEFT JOIN worker_profiles wp_s ON wp_s.user_id = m.sender_id
      LEFT JOIN seeker_profiles sp_s ON sp_s.user_id = m.sender_id
      LEFT JOIN worker_profiles wp_r ON wp_r.user_id = m.receiver_id
      LEFT JOIN seeker_profiles sp_r ON sp_r.user_id = m.receiver_id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY last_message_time DESC`,
      [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId]
    );
    
    res.json({
      success: true,
      data: conversations
    });
    
  } catch (error) {
    console.error('Get conversation list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations'
    });
  }
};

// Get unread message count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [result] = await promisePool.query(
      'SELECT COUNT(*) as unread_count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        unread_count: result[0].unread_count
      }
    });
    
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    });
  }
};

// Mark conversation as read
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.params;
    
    await promisePool.query(
      'UPDATE messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ?',
      [userId, otherUserId]
    );
    
    res.json({
      success: true,
      message: 'Messages marked as read'
    });
    
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read'
    });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getConversationList,
  getUnreadCount,
  markAsRead
};
