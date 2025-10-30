const { promisePool } = require('../config/database');
const {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  generateOTP,
  generateReferralCode,
  sendOTP,
  sanitizeUser,
  formatDateTime
} = require('../utils/helpers');

// Register new user
const register = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    const { email, mobile, password, user_type, referred_by } = req.body;
    
    await connection.beginTransaction();
    
    // Check if user already exists
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ? OR mobile = ?',
      [email, mobile]
    );
    
    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'User with this email or mobile already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Insert user
    const [userResult] = await connection.query(
      'INSERT INTO users (email, mobile, password, user_type, is_verified) VALUES (?, ?, ?, ?, ?)',
      [email, mobile, hashedPassword, user_type, false]
    );
    
    const userId = userResult.insertId;
    
    // Generate referral code
    const referralCode = generateReferralCode(email);
    
    // Create profile based on user type
    if (user_type === 'worker') {
      await connection.query(
        'INSERT INTO worker_profiles (user_id, full_name, referral_code, referred_by) VALUES (?, ?, ?, ?)',
        [userId, '', referralCode, referred_by || null]
      );
    } else {
      await connection.query(
        'INSERT INTO seeker_profiles (user_id, full_name, referral_code, referred_by) VALUES (?, ?, ?, ?)',
        [userId, '', referralCode, referred_by || null]
      );
    }
    
    // Generate and send OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await connection.query(
      'INSERT INTO otps (mobile, email, otp, purpose, expires_at) VALUES (?, ?, ?, ?, ?)',
      [mobile, email, otp, 'registration', formatDateTime(expiresAt)]
    );
    
    // Send OTP (dummy implementation)
    const otpResult = await sendOTP(mobile, otp, 'registration');
    
    await connection.commit();
    
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify OTP sent to your mobile.',
      data: {
        userId,
        email,
        mobile,
        user_type,
        referral_code: referralCode,
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    
    // Find valid OTP
    const [otps] = await promisePool.query(
      'SELECT * FROM otps WHERE mobile = ? AND otp = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [mobile, otp]
    );
    
    if (otps.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }
    
    // Mark OTP as used
    await promisePool.query(
      'UPDATE otps SET is_used = TRUE WHERE id = ?',
      [otps[0].id]
    );
    
    // Verify user
    await promisePool.query(
      'UPDATE users SET is_verified = TRUE WHERE mobile = ?',
      [mobile]
    );
    
    // Get user details
    const [users] = await promisePool.query(
      'SELECT id, email, mobile, user_type, is_verified FROM users WHERE mobile = ?',
      [mobile]
    );
    
    const user = users[0];
    
    // Generate tokens
    const token = generateToken(user.id, user.user_type);
    const refreshToken = generateRefreshToken(user.id);
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        user: sanitizeUser(user),
        token,
        refreshToken
      }
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed'
    });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { mobile } = req.body;
    
    // Check if user exists
    const [users] = await promisePool.query(
      'SELECT id, is_verified FROM users WHERE mobile = ?',
      [mobile]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (users[0].is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Mobile already verified'
      });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await promisePool.query(
      'INSERT INTO otps (mobile, otp, purpose, expires_at) VALUES (?, ?, ?, ?)',
      [mobile, otp, 'registration', formatDateTime(expiresAt)]
    );
    
    // Send OTP
    await sendOTP(mobile, otp, 'verification');
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        otp: process.env.NODE_ENV === 'development' ? otp : undefined
      }
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { login, password } = req.body; // login can be email or mobile
    
    // Find user by email or mobile
    const [users] = await promisePool.query(
      'SELECT * FROM users WHERE email = ? OR mobile = ?',
      [login, login]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const user = users[0];
    
    // Check password
    const isValidPassword = await comparePassword(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }
    
    // Generate tokens
    const token = generateToken(user.id, user.user_type);
    const refreshToken = generateRefreshToken(user.id);
    
    // Get profile data
    const tableName = user.user_type === 'worker' ? 'worker_profiles' : 'seeker_profiles';
    const [profiles] = await promisePool.query(
      `SELECT * FROM ${tableName} WHERE user_id = ?`,
      [user.id]
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: sanitizeUser(user),
        profile: profiles[0] || null,
        token,
        refreshToken
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    
    // Get user details
    const [users] = await promisePool.query(
      'SELECT id, email, mobile, user_type, is_verified, is_active, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get profile
    const tableName = userType === 'worker' ? 'worker_profiles' : 'seeker_profiles';
    const [profiles] = await promisePool.query(
      `SELECT * FROM ${tableName} WHERE user_id = ?`,
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        user: users[0],
        profile: profiles[0] || null
      }
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;
    
    // Get current password
    const [users] = await promisePool.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );
    
    // Verify current password
    const isValid = await comparePassword(current_password, users[0].password);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(new_password);
    
    // Update password
    await promisePool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  getCurrentUser,
  changePassword
};
