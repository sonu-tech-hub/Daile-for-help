const { promisePool } = require('../config/database');
const { paginate } = require('../utils/helpers');

// Get user's referral code and stats
const getReferralInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    
    // Get referral code
    const tableName = userType === 'worker' ? 'worker_profiles' : 'seeker_profiles';
    const [profiles] = await promisePool.query(
      `SELECT referral_code FROM ${tableName} WHERE user_id = ?`,
      [userId]
    );
    
    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    const referralCode = profiles[0].referral_code;
    
    // Get referral stats
    const [stats] = await promisePool.query(
      `SELECT 
        COUNT(*) as total_referrals,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_referrals,
        SUM(CASE WHEN status = 'completed' THEN bonus_amount ELSE 0 END) as total_earnings
      FROM referrals
      WHERE referrer_user_id = ?`,
      [userId]
    );
    
    // Get recent referrals
    const [referrals] = await promisePool.query(
      `SELECT 
        r.*,
        u.email as referred_user_email,
        u.created_at as referred_date
      FROM referrals r
      JOIN users u ON r.referred_user_id = u.id
      WHERE r.referrer_user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10`,
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        referral_code: referralCode,
        stats: {
          total_referrals: stats[0].total_referrals,
          completed_referrals: stats[0].completed_referrals,
          total_earnings: parseFloat(stats[0].total_earnings || 0).toFixed(2),
          bonus_per_referral: parseFloat(process.env.REFERRAL_BONUS || 100)
        },
        recent_referrals: referrals
      }
    });
    
  } catch (error) {
    console.error('Get referral info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral information'
    });
  }
};

// Get all referrals
const getAllReferrals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;
    
    const { limit: limitNum, offset } = paginate(page, limit);
    
    let query = `
      SELECT 
        r.*,
        u.email as referred_user_email,
        u.user_type as referred_user_type,
        CASE 
          WHEN wp.user_id IS NOT NULL THEN wp.full_name
          WHEN sp.user_id IS NOT NULL THEN sp.full_name
          ELSE 'User'
        END as referred_user_name
      FROM referrals r
      JOIN users u ON r.referred_user_id = u.id
      LEFT JOIN worker_profiles wp ON wp.user_id = u.id
      LEFT JOIN seeker_profiles sp ON sp.user_id = u.id
      WHERE r.referrer_user_id = ?
    `;
    
    const params = [userId];
    
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);
    
    const [referrals] = await promisePool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM referrals WHERE referrer_user_id = ?';
    const countParams = [userId];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await promisePool.query(countQuery, countParams);
    
    res.json({
      success: true,
      data: {
        referrals,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total: countResult[0].total,
          total_pages: Math.ceil(countResult[0].total / limitNum)
        }
      }
    });
    
  } catch (error) {
    console.error('Get all referrals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referrals'
    });
  }
};

// Validate referral code
const validateReferralCode = async (req, res) => {
  try {
    const { referral_code } = req.params;
    
    // Check in worker profiles
    const [workerProfiles] = await promisePool.query(
      `SELECT wp.*, u.email, u.is_active 
       FROM worker_profiles wp
       JOIN users u ON wp.user_id = u.id
       WHERE wp.referral_code = ? AND u.is_active = TRUE`,
      [referral_code]
    );
    
    // Check in seeker profiles
    const [seekerProfiles] = await promisePool.query(
      `SELECT sp.*, u.email, u.is_active 
       FROM seeker_profiles sp
       JOIN users u ON sp.user_id = u.id
       WHERE sp.referral_code = ? AND u.is_active = TRUE`,
      [referral_code]
    );
    
    const profile = workerProfiles[0] || seekerProfiles[0];
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code'
      });
    }
    
    res.json({
      success: true,
      message: 'Valid referral code',
      data: {
        referrer_name: profile.full_name,
        bonus_amount: parseFloat(process.env.REFERRAL_BONUS || 100)
      }
    });
    
  } catch (error) {
    console.error('Validate referral code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate referral code'
    });
  }
};

module.exports = {
  getReferralInfo,
  getAllReferrals,
  validateReferralCode
};
