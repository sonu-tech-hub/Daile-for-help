const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const [users] = await promisePool.query(
        'SELECT id, email, mobile, user_type, is_verified, is_active FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = users[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Attach user to request
      req.user = user;
      next();

    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Check if user is a worker
const isWorker = (req, res, next) => {
  if (req.user.user_type !== 'worker') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Worker account required.'
    });
  }
  next();
};

// Check if user is a seeker
const isSeeker = (req, res, next) => {
  if (req.user.user_type !== 'seeker') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Seeker account required.'
    });
  }
  next();
};

// Check if user is verified
const isVerified = (req, res, next) => {
  if (!req.user.is_verified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your account first'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  isWorker,
  isSeeker,
  isVerified
};
