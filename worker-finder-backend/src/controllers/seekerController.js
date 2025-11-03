const { promisePool } = require('../config/database');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { paginate } = require('../utils/helpers');

const isDev = process.env.NODE_ENV === 'development';

// Update seeker profile
const updateSeekerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      full_name,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude
    } = req.body;
    
    await promisePool.query(
      `UPDATE seeker_profiles SET 
        full_name = ?,
        address = ?,
        city = ?,
        state = ?,
        pincode = ?,
        latitude = ?,
        longitude = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`,
      [full_name, address, city, state, pincode, latitude, longitude, userId]
    );
    
    // Get updated profile
    const [profiles] = await promisePool.query(
      'SELECT * FROM seeker_profiles WHERE user_id = ?',
      [userId]
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profiles[0]
    });
    
  } catch (error) {
    console.error('Update seeker profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Upload profile photo
const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Get current photo URL
    const [profiles] = await promisePool.query(
      'SELECT profile_photo FROM seeker_profiles WHERE user_id = ?',
      [userId]
    );
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'profiles', `seeker_${userId}`);
    
    // Delete old photo if exists
    if (profiles[0]?.profile_photo) {
      try {
        const publicId = profiles[0].profile_photo.split('/').pop().split('.')[0];
        await deleteFromCloudinary(`worker-finder/profiles/${publicId}`);
      } catch (err) {
        console.error('Error deleting old photo:', err);
      }
    }
    
    // Update database
    await promisePool.query(
      'UPDATE seeker_profiles SET profile_photo = ? WHERE user_id = ?',
      [result.secure_url, userId]
    );
    
    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        url: result.secure_url
      }
    });
    
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo'
    });
  }
};

// Get seeker profile
const getSeekerProfile = async (req, res) => {
  try {
    const rawSeekerId = req.params.seekerId;
    if (isDev) console.log('getSeekerProfile:start', { rawSeekerId });

    const seekerId = typeof rawSeekerId === 'string' ? rawSeekerId.replace(/^:/, '') : rawSeekerId;
    if (!seekerId || !/^\d+$/.test(String(seekerId))) {
      if (isDev) console.warn('getSeekerProfile:invalid seekerId', { rawSeekerId, seekerId });
      return res.status(400).json({ success: false, message: 'Invalid seekerId parameter. Use numeric id (e.g. /api/seekers/23)' });
    }

    const [seekers] = await promisePool.query(
      `SELECT 
        sp.*,
        u.email,
        u.mobile,
        u.is_verified,
        u.created_at as member_since
      FROM seeker_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.user_id = ? AND u.is_active = TRUE`,
      [seekerId]
    );

    if (seekers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Seeker not found'
      });
    }

    if (isDev) console.log('getSeekerProfile:found', { seekerId });
    res.json({ success: true, data: seekers[0] });

  } catch (error) {
    console.error('Get seeker profile error:', error.message);
    if (isDev) console.error(error.stack);
    res.status(500).json({ success: false, message: 'Failed to fetch seeker profile', error: isDev ? error.message : undefined });
  }
};

// Get seeker dashboard stats
const getSeekerStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get profile
    const [profiles] = await promisePool.query(
      'SELECT * FROM seeker_profiles WHERE user_id = ?',
      [userId]
    );
    
    // Get job stats
    const [jobStats] = await promisePool.query(
      `SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_jobs,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_jobs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs
      FROM jobs WHERE seeker_id = ?`,
      [userId]
    );
    
    // Get spending this month
    const [spending] = await promisePool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as monthly_spending
      FROM payments 
      WHERE payer_id = ? 
        AND status = 'completed' 
        AND MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
      [userId]
    );
    
    // Get favorite workers (most hired)
    const [favoriteWorkers] = await promisePool.query(
      `SELECT 
        wp.user_id,
        wp.full_name,
        wp.profile_photo,
        wp.profession,
        wp.average_rating,
        COUNT(*) as times_hired
      FROM jobs j
      JOIN worker_profiles wp ON j.worker_id = wp.user_id
      WHERE j.seeker_id = ? AND j.status = 'completed'
      GROUP BY wp.user_id
      ORDER BY times_hired DESC
      LIMIT 5`,
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        profile: profiles[0],
        stats: {
          ...jobStats[0],
          monthly_spending: parseFloat(spending[0].monthly_spending).toFixed(2),
          total_amount_spent: profiles[0].total_amount_spent,
          average_rating: profiles[0].average_rating
        },
        favorite_workers: favoriteWorkers
      }
    });
    
  } catch (error) {
    console.error('Get seeker stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch seeker stats'
    });
  }
};

// Get job history
const getJobHistory = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.user.id;
    if (isDev) console.log('getJobHistory:start', { userId, query: req.query });

    // Coerce and validate query params
    const { status } = req.query;
    const page = parseInt(req.query.page || '1', 10) || 1;
    const limit = parseInt(req.query.limit || '20', 10) || 20;

    const { limit: limitNum, offset } = paginate(page, limit);
    
    let query = `
      SELECT 
        j.*,
        wp.full_name as worker_name,
        wp.profile_photo as worker_photo,
    wp.profession,
    wu.mobile as worker_mobile,
        c.name as category_name
      FROM jobs j
    LEFT JOIN worker_profiles wp ON j.worker_id = wp.user_id
    LEFT JOIN users wu ON wp.user_id = wu.id
      LEFT JOIN categories c ON j.category_id = c.id
      WHERE j.seeker_id = ?
    `;
    
    const params = [userId];
    
    if (status) {
      query += ' AND j.status = ?';
      params.push(status);
    }
    query += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    if (isDev) console.log('getJobHistory:runningQuery', { sql: query.replace(/\s+/g, ' '), params });

    const [jobs] = await promisePool.query(query, params);
    if (isDev) console.log('getJobHistory:jobsFetched', { count: jobs.length });
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM jobs WHERE seeker_id = ?';
    const countParams = [userId];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await promisePool.query(countQuery, countParams);
    if (isDev) console.log('getJobHistory:count', { total: countResult[0].total });
    
    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: page,
          limit: limitNum,
          total: countResult[0].total,
          total_pages: Math.max(1, Math.ceil(countResult[0].total / limitNum))
        }
      }
    });
    
  } catch (error) {
    console.error('Get job history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job history'
    });
  }
};

module.exports = {
  updateSeekerProfile,
  uploadProfilePhoto,
  getSeekerProfile,
  getSeekerStats,
  getJobHistory
};
