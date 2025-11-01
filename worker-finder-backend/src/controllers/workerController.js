const { promisePool } = require('../config/database');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { calculateDistance, paginate } = require('../utils/helpers');

const isDev = process.env.NODE_ENV === 'development';

// Create/Update worker profile
const updateWorkerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    if (isDev) console.log('updateWorkerProfile:start', { userId, bodyKeys: Object.keys(req.body) });
    const {
      full_name,
      whatsapp_number,
      profession,
      experience_years,
      hourly_rate,
      bio,
      skills,
      certifications,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      availability_status
    } = req.body;
    
    // Parse JSON fields if they're strings
    const parsedSkills = typeof skills === 'string' ? JSON.parse(skills) : skills;
    const parsedCertifications = typeof certifications === 'string' ? JSON.parse(certifications) : certifications;
    
  // Update profile
    const [result] = await promisePool.query(
      `UPDATE worker_profiles SET 
        full_name = ?,
        whatsapp_number = ?,
        profession = ?,
        experience_years = ?,
        hourly_rate = ?,
        bio = ?,
        skills = ?,
        certifications = ?,
        address = ?,
        city = ?,
        state = ?,
        pincode = ?,
        latitude = ?,
        longitude = ?,
        availability_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`,
      [
        full_name, whatsapp_number, profession, experience_years, hourly_rate,
        bio, JSON.stringify(parsedSkills), JSON.stringify(parsedCertifications),
        address, city, state, pincode, latitude, longitude, availability_status,
        userId
      ]
    );
    
    // Get updated profile
    const [profiles] = await promisePool.query(
      'SELECT * FROM worker_profiles WHERE user_id = ?',
      [userId]
    );

    if (isDev) console.log('updateWorkerProfile:dbResult', { affectedRows: result.affectedRows, profileFound: profiles.length > 0 });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: profiles[0]
    });
    
  } catch (error) {
    console.error('Update worker profile error:', error.message);
    if (isDev) console.error(error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: isDev ? error.message : undefined
    });
  }
};

// Upload profile photo
const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    if (isDev) console.log('uploadProfilePhoto:start', { userId, hasFile: !!req.file });
    // multer may populate req.file (single) or req.files (fields)
    let file = req.file;
    if (!file && req.files) {
      // check common field names
      if (req.files.photo && req.files.photo.length > 0) file = req.files.photo[0];
      else if (req.files.image && req.files.image.length > 0) file = req.files.image[0];
    }

    if (!file) {
      if (isDev) console.warn('uploadProfilePhoto:no file in request', { filesPresent: !!req.files });
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Get current photo URL to delete old one
    const [profiles] = await promisePool.query(
      'SELECT profile_photo FROM worker_profiles WHERE user_id = ?',
      [userId]
    );
    if (isDev) console.log('uploadProfilePhoto:existingProfile', { profileExists: profiles.length > 0, existingPhoto: profiles[0]?.profile_photo });
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(file.buffer, 'profiles', `worker_${userId}`);
    if (isDev) console.log('uploadProfilePhoto:cloudinaryResult', { url: result.secure_url, public_id: result.public_id });
    
    // Delete old photo if exists
    if (profiles[0]?.profile_photo) {
      try {
        const publicId = profiles[0].profile_photo.split('/').pop().split('.')[0];
        await deleteFromCloudinary(`worker-finder/profiles/${publicId}`);
        if (isDev) console.log('uploadProfilePhoto:deletedOldPhoto', { publicId });
      } catch (err) {
        console.error('Error deleting old photo:', err.message);
        if (isDev) console.error(err.stack);
      }
    }
    
    // Update database
    await promisePool.query(
      'UPDATE worker_profiles SET profile_photo = ? WHERE user_id = ?',
      [result.secure_url, userId]
    );
    
    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        url: result.secure_url,
        public_id: result.public_id
      }
    });
    
  } catch (error) {
    console.error('Upload profile photo error:', error.message);
    if (isDev) console.error(error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo',
      error: isDev ? error.message : undefined
    });
  }
};

// Upload verification proof
const uploadVerificationProof = async (req, res) => {
  try {
    const userId = req.user.id;
    if (isDev) console.log('uploadVerificationProof:start', { userId, hasFile: !!req.file });
    
    if (!req.file) {
      if (isDev) console.warn('uploadVerificationProof:no file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'verification', `proof_${userId}`);
    if (isDev) console.log('uploadVerificationProof:cloudinaryResult', { url: result.secure_url });
    
    // Update database
    await promisePool.query(
      'UPDATE worker_profiles SET verification_proof = ?, aadhar_verified = TRUE WHERE user_id = ?',
      [result.secure_url, userId]
    );
    
    res.json({
      success: true,
      message: 'Verification proof uploaded successfully',
      data: {
        url: result.secure_url
      }
    });
    
  } catch (error) {
    console.error('Upload verification proof error:', error.message);
    if (isDev) console.error(error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to upload verification proof',
      error: isDev ? error.message : undefined
    });
  }
};

// Get worker profile (public)
const getWorkerProfile = async (req, res) => {
  try {
    const rawWorkerId = req.params.workerId;
    if (isDev) console.log('getWorkerProfile:start', { rawWorkerId });

    // Sanitize workerId: some clients mistakenly send a leading ':' (e.g. '/api/workers/:23')
    // Strip a leading colon and validate the ID.
    const workerId = typeof rawWorkerId === 'string' ? rawWorkerId.replace(/^:/, '') : rawWorkerId;

    if (!workerId || !/^\d+$/.test(String(workerId))) {
      if (isDev) console.warn('getWorkerProfile:invalid workerId', { rawWorkerId, workerId });
      return res.status(400).json({
        success: false,
        message: 'Invalid workerId parameter. Use the numeric id (e.g. /api/workers/23)'
      });
    }
    
    // Get worker profile with user details
    const [workers] = await promisePool.query(
      `SELECT 
        wp.*,
        u.email,
        u.mobile,
        u.is_verified,
        u.created_at as member_since
      FROM worker_profiles wp
      JOIN users u ON wp.user_id = u.id
      WHERE wp.user_id = ? AND u.is_active = TRUE`,
      [workerId]
    );
    
    if (workers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }
    
    // Get reviews
    const [reviews] = await promisePool.query(
      `SELECT 
        r.*,
        u.email as reviewer_email,
        CASE 
          WHEN wp.user_id IS NOT NULL THEN wp.full_name
          WHEN sp.user_id IS NOT NULL THEN sp.full_name
          ELSE 'Anonymous'
        END as reviewer_name
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN worker_profiles wp ON wp.user_id = u.id
      LEFT JOIN seeker_profiles sp ON sp.user_id = u.id
      WHERE r.reviewee_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10`,
      [workerId]
    );
    
  const workerData = workers[0];
  if (isDev) console.log('getWorkerProfile:workerDataLoaded', { workerId, reviewsCount: reviews.length });
    
    // Parse JSON fields
    workerData.skills = workerData.skills ? JSON.parse(workerData.skills) : [];
    workerData.certifications = workerData.certifications ? JSON.parse(workerData.certifications) : [];
    
    res.json({
      success: true,
      data: {
        profile: workerData,
        reviews,
        review_count: reviews.length
      }
    });
    
  } catch (error) {
    console.error('Get worker profile error:', error.message);
    if (isDev) console.error(error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker profile',
      error: isDev ? error.message : undefined
    });
  }
};

// Search workers (location-based with filters)
const searchWorkers = async (req, res) => {
  try {
    if (isDev) console.log('searchWorkers:start', { query: req.query });
    const {
      latitude,
      longitude,
      radius = 25,
      profession,
      min_experience,
      max_experience,
      min_rating,
      city,
      availability_status,
      page = 1,
      limit = 20
    } = req.query;
    
    const { limit: limitNum, offset } = paginate(page, limit);
    
    let query = `
      SELECT 
        wp.*,
        u.email,
        u.mobile,
        u.is_verified,
        ${latitude && longitude ? `
          (6371 * acos(cos(radians(?)) * cos(radians(wp.latitude)) * 
          cos(radians(wp.longitude) - radians(?)) + 
          sin(radians(?)) * sin(radians(wp.latitude)))) AS distance
        ` : '0 AS distance'}
      FROM worker_profiles wp
      JOIN users u ON wp.user_id = u.id
      WHERE u.is_active = TRUE
        AND wp.full_name != ''
    `;
    
    const params = [];
    
    // Add distance calculation parameters
    if (latitude && longitude) {
      params.push(latitude, longitude, latitude);
    }
    
    // Filter by profession
    if (profession) {
      query += ' AND wp.profession LIKE ?';
      params.push(`%${profession}%`);
    }
    
    // Filter by experience
    if (min_experience) {
      query += ' AND wp.experience_years >= ?';
      params.push(parseFloat(min_experience));
    }
    
    if (max_experience) {
      query += ' AND wp.experience_years <= ?';
      params.push(parseFloat(max_experience));
    }
    
    // Filter by rating
    if (min_rating) {
      query += ' AND wp.average_rating >= ?';
      params.push(parseFloat(min_rating));
    }
    
    // Filter by city
    if (city) {
      query += ' AND wp.city LIKE ?';
      params.push(`%${city}%`);
    }
    
    // Filter by availability
    if (availability_status) {
      query += ' AND wp.availability_status = ?';
      params.push(availability_status);
    }
    
    // Filter by radius (if location provided)
    if (latitude && longitude) {
      query += ' HAVING distance <= ?';
      params.push(parseFloat(radius));
    }
    
    // Sort by distance (nearest first) then by rating
    query += latitude && longitude 
      ? ' ORDER BY distance ASC, wp.average_rating DESC, wp.total_jobs_completed DESC'
      : ' ORDER BY wp.average_rating DESC, wp.total_jobs_completed DESC';
    
    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);
    
  const [workers] = await promisePool.query(query, params);
  if (isDev) console.log('searchWorkers:db', { fetched: workers.length, params });
    
    // Parse JSON fields
    workers.forEach(worker => {
      worker.skills = worker.skills ? JSON.parse(worker.skills) : [];
      worker.certifications = worker.certifications ? JSON.parse(worker.certifications) : [];
      worker.distance = worker.distance ? parseFloat(worker.distance.toFixed(2)) : null;
    });
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM worker_profiles wp
      JOIN users u ON wp.user_id = u.id
      WHERE u.is_active = TRUE AND wp.full_name != ''
    `;
    
    const countParams = [];
    
    if (profession) {
      countQuery += ' AND wp.profession LIKE ?';
      countParams.push(`%${profession}%`);
    }
    
    if (min_experience) {
      countQuery += ' AND wp.experience_years >= ?';
      countParams.push(parseFloat(min_experience));
    }
    
    if (max_experience) {
      countQuery += ' AND wp.experience_years <= ?';
      countParams.push(parseFloat(max_experience));
    }
    
    if (min_rating) {
      countQuery += ' AND wp.average_rating >= ?';
      countParams.push(parseFloat(min_rating));
    }
    
    if (city) {
      countQuery += ' AND wp.city LIKE ?';
      countParams.push(`%${city}%`);
    }
    
    if (availability_status) {
      countQuery += ' AND wp.availability_status = ?';
      countParams.push(availability_status);
    }
    
  const [countResult] = await promisePool.query(countQuery, countParams);
  if (isDev) console.log('searchWorkers:count', { total: countResult[0].total });
    const total = countResult[0].total;
    
    res.json({
      success: true,
      data: {
        workers,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total,
          total_pages: Math.ceil(total / limitNum)
        },
        filters: {
          latitude,
          longitude,
          radius: parseFloat(radius),
          profession,
          min_experience,
          max_experience,
          min_rating,
          city,
          availability_status
        }
      }
    });
    
  } catch (error) {
    console.error('Search workers error:', error.message);
    if (isDev) console.error(error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to search workers',
      error: isDev ? error.message : undefined
    });
  }
};

// Get worker dashboard stats
const getWorkerStats = async (req, res) => {
  try {
    const userId = req.user.id;
    if (isDev) console.log('getWorkerStats:start', { userId });
    
    // Get profile with stats
    const [profiles] = await promisePool.query(
      'SELECT * FROM worker_profiles WHERE user_id = ?',
      [userId]
    );
    
    // Get job stats
    const [jobStats] = await promisePool.query(
      `SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_jobs,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as pending_jobs
      FROM jobs WHERE worker_id = ?`,
      [userId]
    );
    
    // Get earnings this month
    const [earnings] = await promisePool.query(
      `SELECT 
        COALESCE(SUM(net_amount), 0) as monthly_earnings
      FROM payments 
      WHERE payee_id = ? 
        AND status = 'completed' 
        AND MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())`,
      [userId]
    );
    
    // Get recent reviews
    const [recentReviews] = await promisePool.query(
      `SELECT r.*, u.email as reviewer_email 
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = ?
      ORDER BY r.created_at DESC
      LIMIT 5`,
      [userId]
    );
    
    const profile = profiles[0] || {};
    profile.skills = profile.skills ? JSON.parse(profile.skills) : [];
    profile.certifications = profile.certifications ? JSON.parse(profile.certifications) : [];
    
    if (isDev) console.log('getWorkerStats:db', { profileFound: !!profiles[0], jobStats: jobStats[0], recentReviews: recentReviews.length, monthlyEarnings: earnings[0].monthly_earnings });
    
    res.json({
      success: true,
      data: {
        profile,
        stats: {
          ...jobStats[0],
          monthly_earnings: parseFloat(earnings[0].monthly_earnings).toFixed(2),
          average_rating: profile.average_rating,
          total_earnings: profile.total_earnings
        },
        recent_reviews: recentReviews
      }
    });
    
  } catch (error) {
    console.error('Get worker stats error:', error.message);
    if (isDev) console.error(error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker stats',
      error: isDev ? error.message : undefined
    });
  }
};

// Update worker availability
const updateAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { availability_status } = req.body;
    
    await promisePool.query(
      'UPDATE worker_profiles SET availability_status = ? WHERE user_id = ?',
      [availability_status, userId]
    );
    
    res.json({
      success: true,
      message: 'Availability updated successfully',
      data: { availability_status }
    });
    
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability'
    });
  }
};

module.exports = {
  updateWorkerProfile,
  uploadProfilePhoto,
  uploadVerificationProof,
  getWorkerProfile,
  searchWorkers,
  getWorkerStats,
  updateAvailability
};
