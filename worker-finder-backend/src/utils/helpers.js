const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
const generateToken = (userId, userType) => {
  return jwt.sign(
    { userId, userType },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

// Generate OTP (6 digits)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate unique referral code
const generateReferralCode = (name) => {
  const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
  const namePrefix = name.substring(0, 3).toUpperCase();
  return `${namePrefix}${randomString}`;
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Distance in km
};

const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Calculate commission
const calculateCommission = (amount) => {
  const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION || 18) / 100;
  const trustFeeRate = parseFloat(process.env.TRUST_SAFETY_FEE || 7) / 100;
  
  const commission = amount * commissionRate;
  const trustFee = amount * trustFeeRate;
  const netAmount = amount - commission - trustFee;
  
  return {
    amount: parseFloat(amount.toFixed(2)),
    commission: parseFloat(commission.toFixed(2)),
    trustFee: parseFloat(trustFee.toFixed(2)),
    netAmount: parseFloat(netAmount.toFixed(2))
  };
};

// Format date to MySQL datetime
const formatDateTime = (date = new Date()) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Paginate results
const paginate = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;
  
  return {
    limit: limitNum,
    offset: offset,
    page: pageNum
  };
};

// Send OTP via email
const sendOTP = async (email, otp, purpose = 'verification') => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Your OTP for ${purpose}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Worker Finder - Verification Code</h2>
          <p>Hello,</p>
          <p>Your verification code for ${purpose} is:</p>
          <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 5px;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', info.messageId);

    return {
      success: true,
      message: `OTP sent successfully to ${email}`,
      messageId: info.messageId,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined // Only show in dev
    };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw {
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    };
  }
};

// Send email with customizable template
const sendEmail = async (to, subject, text, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html: html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Worker Finder</h2>
          ${text.split('\n').map(line => `<p>${line}</p>`).join('')}
          <hr>
          <p style="color: #666; font-size: 12px;">This is an automated message from Worker Finder. Please do not reply to this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', info.messageId);

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw {
      success: false,
      message: 'Failed to send email',
      error: error.message
    };
  };
};

// Generate transaction ID
const generateTransactionId = () => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TXN${timestamp}${random}`;
};

// Sanitize user data (remove sensitive fields)
const sanitizeUser = (user) => {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

// Check if user can review (job completed and not already reviewed)
const canReview = async (jobId, reviewerId, promisePool) => {
  try {
    // Check if job is completed
    const [jobs] = await promisePool.query(
      'SELECT status FROM jobs WHERE id = ?',
      [jobId]
    );
    
    if (jobs.length === 0 || jobs[0].status !== 'completed') {
      return { canReview: false, reason: 'Job not completed yet' };
    }
    
    // Check if already reviewed
    const [reviews] = await promisePool.query(
      'SELECT id FROM reviews WHERE job_id = ? AND reviewer_id = ?',
      [jobId, reviewerId]
    );
    
    if (reviews.length > 0) {
      return { canReview: false, reason: 'Already reviewed this job' };
    }
    
    return { canReview: true };
  } catch (error) {
    throw error;
  }
};

// Update average rating
const updateAverageRating = async (userId, userType, promisePool) => {
  try {
    // Calculate average rating
    const [ratings] = await promisePool.query(
      'SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewee_id = ?',
      [userId]
    );
    
    const avgRating = ratings[0].avg_rating || 0;
    
    // Update user profile
    const tableName = userType === 'worker' ? 'worker_profiles' : 'seeker_profiles';
    await promisePool.query(
      `UPDATE ${tableName} SET average_rating = ? WHERE user_id = ?`,
      [avgRating, userId]
    );
    
    return avgRating;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  generateOTP,
  generateReferralCode,
  calculateDistance,
  calculateCommission,
  formatDateTime,
  paginate,
  sendOTP,
  sendEmail,
  generateTransactionId,
  sanitizeUser,
  canReview,
  updateAverageRating
};
