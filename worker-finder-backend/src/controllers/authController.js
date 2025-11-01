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
    // Set expiration 10 minutes from now using UTC
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    
    console.log('Generated OTP details:', {
        email,
        otp,
        currentTime: now.toISOString(),
        expiresAt: expiresAt.toISOString()
    });

    // Store OTP in database using UTC_TIMESTAMP()
    const [otpInsertResult] = await connection.query(
      'INSERT INTO otps (mobile, email, otp, purpose, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))',
      [mobile, email, otp, 'registration']
    );
    
    console.log('OTP stored in database:', {
        insertId: otpInsertResult.insertId,
        success: otpInsertResult.affectedRows > 0
    });

    // Send OTP via email
    const otpResult = await sendOTP(email, otp, 'verification');
    
    await connection.commit();
    
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify OTP sent to your email.',
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
  const connection = await promisePool.getConnection();
  
  try {
    const { identifier, otp } = req.body;
    console.log('Starting OTP verification for:', identifier);
    
    await connection.beginTransaction();
    
    // Check if user exists and is not already verified
    const [existingUsers] = await connection.query(
      'SELECT id, email, mobile, user_type, is_verified FROM users WHERE email = ? OR mobile = ?',
      [identifier, identifier]
    );
    console.log('User lookup result:', { found: existingUsers.length > 0 });

    if (existingUsers.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = existingUsers[0];

    if (user.is_verified) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'User is already verified'
      });
    }

    // First, get all recent OTPs for debugging
    const [allOtps] = await connection.query(
      'SELECT id, email, mobile, otp, purpose, expires_at, is_used, created_at FROM otps WHERE (email = ? OR mobile = ?) ORDER BY created_at DESC LIMIT 5',
      [identifier, identifier]
    );

    console.log('Debug OTP Verification:', {
      identifier: identifier,
      providedOTP: otp,
      foundOTPs: allOtps.map(record => ({
        id: record.id,
        storedOTP: record.otp,
        isMatch: record.otp === otp,
        created_at: record.created_at,
        expires_at: record.expires_at,
        is_used: record.is_used,
        email: record.email
      }))
    });

    // Check for exact OTP match without expiry check first
    const [exactMatches] = await connection.query(
      'SELECT * FROM otps WHERE (email = ? OR mobile = ?) AND otp = ? AND is_used = FALSE ORDER BY created_at DESC LIMIT 1',
      [identifier, identifier, otp]
    );

    console.log('OTP Match Check:', {
      hasExactMatch: exactMatches.length > 0,
      currentTime: new Date().toISOString(),
      otpDetails: exactMatches.length > 0 ? {
        stored: exactMatches[0].otp,
        provided: otp,
        expiresAt: exactMatches[0].expires_at,
        isExpired: new Date(exactMatches[0].expires_at) < new Date()
      } : null
    });

    // Now check with all conditions using UTC_TIMESTAMP()
    const [validOtps] = await connection.query(
      'SELECT * FROM otps WHERE (email = ? OR mobile = ?) AND otp = ? AND is_used = FALSE AND expires_at > UTC_TIMESTAMP() ORDER BY created_at DESC LIMIT 1',
      [identifier, identifier, otp]
    );
    
    console.log('Valid OTP check:', {
      currentUTC: new Date().toISOString(),
      found: validOtps.length > 0,
      validOtpDetails: validOtps.length > 0 ? {
        id: validOtps[0].id,
        expiresAt: validOtps[0].expires_at,
        isUsed: validOtps[0].is_used
      } : null
    });

    if (validOtps.length === 0) {
      await connection.rollback();
      
      // Check if any OTP exists to give more specific error message
      if (allOtps.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found for this email/mobile',
          debug: process.env.NODE_ENV === 'development' ? {
            identifier,
            providedOTP: otp,
            reason: 'no_otp_found'
          } : undefined
        });
      }
      
      // If we found an exact match but it's not valid, explain why
      if (exactMatches.length > 0) {
        const exactMatch = exactMatches[0];
        const currentUTC = new Date();
        const expiryUTC = new Date(exactMatch.expires_at);
        
        console.log('Expiry Check:', {
          otpId: exactMatch.id,
          expiryTime: expiryUTC.toISOString(),
          currentTime: currentUTC.toISOString(),
          isExpired: expiryUTC < currentUTC
        });

        if (expiryUTC < currentUTC) {
          return res.status(400).json({
            success: false,
            message: 'OTP has expired. Please request a new one',
            debug: process.env.NODE_ENV === 'development' ? {
              expiresAt: expiryUTC.toISOString(),
              currentTime: currentUTC.toISOString(),
              timeDiff: Math.floor((currentUTC - expiryUTC) / 1000 / 60) + ' minutes',
              reason: 'otp_expired'
            } : undefined
          });
        }
      }
      
      const lastOtp = allOtps[0];
      if (lastOtp.is_used) {
        return res.status(400).json({
          success: false,
          message: 'OTP has already been used',
          debug: process.env.NODE_ENV === 'development' ? {
            lastOtpTime: lastOtp.created_at,
            reason: 'otp_used'
          } : undefined
        });
      }
      
      // If we get here, the OTP provided doesn't match what's stored
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check and try again',
        debug: process.env.NODE_ENV === 'development' ? {
          lastValidOTP: lastOtp.otp,
          providedOTP: otp,
          reason: 'otp_mismatch'
        } : undefined
      });
    }

    // Mark OTP as used
    const [updateOtpResult] = await connection.query(
      'UPDATE otps SET is_used = TRUE WHERE id = ?',
      [validOtps[0].id]
    );
    console.log('OTP marked as used:', { 
      otpId: validOtps[0].id,
      success: updateOtpResult.affectedRows > 0 
    });

    // Verify user with confirmation
    const [updateUserResult] = await connection.query(
      'UPDATE users SET is_verified = TRUE WHERE id = ?',
      [user.id]
    );
    console.log('User verification status:', { 
      success: updateUserResult.affectedRows > 0 
    });

    if (updateUserResult.affectedRows === 0) {
      await connection.rollback();
      throw new Error('Failed to verify user');
    }

    // Generate tokens
    const token = generateToken(user.id, user.user_type);
    const refreshToken = generateRefreshToken(user.id);
    
    // Commit the transaction
    await connection.commit();
    console.log('OTP verification completed successfully for user:', user.id);
    
    res.json({
      success: true,
      message: 'Account verified successfully',
      data: {
        user: sanitizeUser(user),
        token,
        refreshToken
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  try {
    const { identifier } = req.body;

    // Check if user exists
    const [users] = await promisePool.query(
      'SELECT id, email, mobile, is_verified FROM users WHERE email = ? OR mobile = ?',
      [identifier, identifier]
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
      'INSERT INTO otps (mobile, email, otp, purpose, expires_at) VALUES (?, ?, ?, ?, ?)',
      [users[0].mobile, users[0].email, otp, 'registration', formatDateTime(expiresAt)]
    );

    // Send OTP via email or SMS
    await sendOTP(identifier, otp, 'verification');
    
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
    console.log('🔒 Login attempt:', { identifier: req.body.login });
    const { login, password } = req.body; // login can be email or mobile
    
    // Find user by email or mobile
    console.log('🔍 Searching for user...');
    const [users] = await promisePool.query(
      'SELECT * FROM users WHERE email = ? OR mobile = ?',
      [login, login]
    );
    
    if (users.length === 0) {
      console.log('❌ User not found:', { identifier: login });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const user = users[0];
    console.log('✅ User found:', { 
      userId: user.id, 
      userType: user.user_type, 
      isVerified: user.is_verified, 
      isActive: user.is_active 
    });
    
    // Check password
    console.log('🔐 Verifying password...');
    const isValidPassword = await comparePassword(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', user.id);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if account is active
    if (!user.is_active) {
      console.log('❌ Account deactivated:', user.id);
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }
    
    // Generate tokens
    console.log('🔑 Generating authentication tokens...');
    let token, refreshToken;
    try {
      token = generateToken(user.id, user.user_type);
      refreshToken = generateRefreshToken(user.id);
      console.log('✅ Tokens generated successfully');
    } catch (tokenError) {
      console.error('❌ Token generation failed:', tokenError);
      throw new Error('Authentication token generation failed');
    }
    
    // Get profile data
    console.log('📋 Fetching user profile...');
    const tableName = user.user_type === 'worker' ? 'worker_profiles' : 'seeker_profiles';
    const [profiles] = await promisePool.query(
      `SELECT * FROM ${tableName} WHERE user_id = ?`,
      [user.id]
    );
    
    const profile = profiles[0] || null;
    console.log('✅ Profile retrieved:', { hasProfile: !!profile });
    
    // Prepare sanitized response
    const userData = sanitizeUser(user);
    console.log('🔓 Login successful:', { userId: user.id, userType: user.user_type });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        profile,
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
