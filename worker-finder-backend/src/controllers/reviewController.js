const { promisePool } = require('../config/database');
const { uploadToCloudinary } = require('../config/cloudinary');
const { canReview, updateAverageRating } = require('../utils/helpers');

// Create review
const createReview = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    const reviewerId = req.user.id;
    const {
      job_id,
      reviewee_id,
      rating,
      review_text,
      punctuality_rating,
      quality_rating,
      behavior_rating
    } = req.body;
    
    await connection.beginTransaction();
    
    // Check if user can review
    const reviewCheck = await canReview(job_id, reviewerId, connection);
    
    if (!reviewCheck.canReview) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: reviewCheck.reason
      });
    }
    
    // Upload review photos if provided
    let photoUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'reviews');
        photoUrls.push(result.secure_url);
      }
    }
    
    // Insert review
    const [result] = await connection.query(
      `INSERT INTO reviews (
        job_id, reviewer_id, reviewee_id, rating, review_text,
        punctuality_rating, quality_rating, behavior_rating, photos, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        job_id, reviewerId, reviewee_id, rating, review_text,
        punctuality_rating, quality_rating, behavior_rating,
        JSON.stringify(photoUrls)
      ]
    );
    
    // Update average rating for reviewee
    const [revieweeUser] = await connection.query(
      'SELECT user_type FROM users WHERE id = ?',
      [reviewee_id]
    );
    
    await updateAverageRating(reviewee_id, revieweeUser[0].user_type, connection);
    
    await connection.commit();
    
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        review_id: result.insertId
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review'
    });
  } finally {
    connection.release();
  }
};

// Get reviews for a user
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const limitNum = Math.min(100, parseInt(limit));
    const offset = (parseInt(page) - 1) * limitNum;
    
    const [reviews] = await promisePool.query(
      `SELECT 
        r.*,
        u.email as reviewer_email,
        CASE 
          WHEN wp.user_id IS NOT NULL THEN wp.full_name
          WHEN sp.user_id IS NOT NULL THEN sp.full_name
          ELSE 'Anonymous'
        END as reviewer_name,
        CASE 
          WHEN wp.user_id IS NOT NULL THEN wp.profile_photo
          WHEN sp.user_id IS NOT NULL THEN sp.profile_photo
          ELSE NULL
        END as reviewer_photo
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN worker_profiles wp ON wp.user_id = u.id
      LEFT JOIN seeker_profiles sp ON sp.user_id = u.id
      WHERE r.reviewee_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, limitNum, offset]
    );
    
    // Parse photos JSON
    reviews.forEach(review => {
      review.photos = review.photos ? JSON.parse(review.photos) : [];
    });
    
    // Get total count and rating breakdown
    const [stats] = await promisePool.query(
      `SELECT 
        COUNT(*) as total,
        AVG(rating) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM reviews WHERE reviewee_id = ?`,
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        reviews,
        stats: {
          total: stats[0].total,
          average_rating: parseFloat(stats[0].average_rating || 0).toFixed(2),
          rating_breakdown: {
            five_star: stats[0].five_star,
            four_star: stats[0].four_star,
            three_star: stats[0].three_star,
            two_star: stats[0].two_star,
            one_star: stats[0].one_star
          }
        },
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total: stats[0].total,
          total_pages: Math.ceil(stats[0].total / limitNum)
        }
      }
    });
    
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

// Mark review as helpful
const markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    await promisePool.query(
      'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?',
      [reviewId]
    );
    
    res.json({
      success: true,
      message: 'Review marked as helpful'
    });
    
  } catch (error) {
    console.error('Mark review helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark review as helpful'
    });
  }
};

// Get review by job ID
const getJobReview = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    
    const [reviews] = await promisePool.query(
      `SELECT r.*, 
        u.email as reviewer_email
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.job_id = ?`,
      [jobId]
    );
    
    // Parse photos
    reviews.forEach(review => {
      review.photos = review.photos ? JSON.parse(review.photos) : [];
    });
    
    // Check if current user can still review
    const reviewCheck = await canReview(jobId, userId, promisePool);
    
    res.json({
      success: true,
      data: {
        reviews,
        can_review: reviewCheck.canReview,
        review_reason: reviewCheck.reason
      }
    });
    
  } catch (error) {
    console.error('Get job review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job reviews'
    });
  }
};

module.exports = {
  createReview,
  getUserReviews,
  markReviewHelpful,
  getJobReview
};
