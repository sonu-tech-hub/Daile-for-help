const { promisePool } = require('../config/database');
const { uploadToCloudinary } = require('../config/cloudinary');
const { paginate } = require('../utils/helpers');

// Create dispute
const createDispute = async (req, res) => {
  try {
    const raisedBy = req.user.id;
    const { job_id, against_user, reason, description } = req.body;
    
    // Check if job exists
    const [jobs] = await promisePool.query(
      'SELECT * FROM jobs WHERE id = ? AND (seeker_id = ? OR worker_id = ?)',
      [job_id, raisedBy, raisedBy]
    );
    
    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you are not part of this job'
      });
    }
    
    // Check if dispute already exists for this job
    const [existingDisputes] = await promisePool.query(
      'SELECT id FROM disputes WHERE job_id = ? AND status IN ("open", "under_review")',
      [job_id]
    );
    
    if (existingDisputes.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A dispute already exists for this job'
      });
    }
    
    // Upload evidence photos if provided
    let evidenceUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'disputes');
        evidenceUrls.push(result.secure_url);
      }
    }
    
    // Create dispute
    const [result] = await promisePool.query(
      `INSERT INTO disputes (job_id, raised_by, against_user, reason, description, evidence_photos)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [job_id, raisedBy, against_user, reason, description, JSON.stringify(evidenceUrls)]
    );
    
    // Update job status
    await promisePool.query(
      'UPDATE jobs SET status = "disputed" WHERE id = ?',
      [job_id]
    );
    
    // Notify the other party
    await promisePool.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [against_user, 'Dispute Raised', 'A dispute has been raised against you', 'system', result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Dispute created successfully. Our team will review it shortly.',
      data: {
        dispute_id: result.insertId
      }
    });
    
  } catch (error) {
    console.error('Create dispute error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dispute'
    });
  }
};

// Get user disputes
const getUserDisputes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;
    
    const { limit: limitNum, offset } = paginate(page, limit);
    
    let query = `
      SELECT 
        d.*,
        j.title as job_title,
        u1.email as raised_by_email,
        u2.email as against_user_email,
        CASE 
          WHEN wp1.user_id IS NOT NULL THEN wp1.full_name
          WHEN sp1.user_id IS NOT NULL THEN sp1.full_name
          ELSE 'User'
        END as raised_by_name,
        CASE 
          WHEN wp2.user_id IS NOT NULL THEN wp2.full_name
          WHEN sp2.user_id IS NOT NULL THEN sp2.full_name
          ELSE 'User'
        END as against_user_name
      FROM disputes d
      JOIN jobs j ON d.job_id = j.id
      JOIN users u1 ON d.raised_by = u1.id
      JOIN users u2 ON d.against_user = u2.id
      LEFT JOIN worker_profiles wp1 ON wp1.user_id = u1.id
      LEFT JOIN seeker_profiles sp1 ON sp1.user_id = u1.id
      LEFT JOIN worker_profiles wp2 ON wp2.user_id = u2.id
      LEFT JOIN seeker_profiles sp2 ON sp2.user_id = u2.id
      WHERE d.raised_by = ? OR d.against_user = ?
    `;
    
    const params = [userId, userId];
    
    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);
    
    const [disputes] = await promisePool.query(query, params);
    
    // Parse evidence photos
    disputes.forEach(dispute => {
      dispute.evidence_photos = dispute.evidence_photos ? JSON.parse(dispute.evidence_photos) : [];
    });
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM disputes 
      WHERE raised_by = ? OR against_user = ?
    `;
    const countParams = [userId, userId];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await promisePool.query(countQuery, countParams);
    
    res.json({
      success: true,
      data: {
        disputes,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total: countResult[0].total,
          total_pages: Math.ceil(countResult[0].total / limitNum)
        }
      }
    });
    
  } catch (error) {
    console.error('Get user disputes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch disputes'
    });
  }
};

// Get dispute details
const getDisputeDetails = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const userId = req.user.id;
    
    const [disputes] = await promisePool.query(
      `SELECT 
        d.*,
        j.*,
        u1.email as raised_by_email,
        u2.email as against_user_email
      FROM disputes d
      JOIN jobs j ON d.job_id = j.id
      JOIN users u1 ON d.raised_by = u1.id
      JOIN users u2 ON d.against_user = u2.id
      WHERE d.id = ? AND (d.raised_by = ? OR d.against_user = ?)`,
      [disputeId, userId, userId]
    );
    
    if (disputes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }
    
    const dispute = disputes[0];
    dispute.evidence_photos = dispute.evidence_photos ? JSON.parse(dispute.evidence_photos) : [];
    
    res.json({
      success: true,
      data: dispute
    });
    
  } catch (error) {
    console.error('Get dispute details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dispute details'
    });
  }
};

// Update dispute (admin only - simplified for now)
const updateDisputeStatus = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { status, resolution_notes } = req.body;
    
    await promisePool.query(
      `UPDATE disputes SET 
        status = ?, 
        resolution_notes = ?,
        resolved_at = CASE WHEN ? IN ('resolved', 'closed') THEN NOW() ELSE NULL END
       WHERE id = ?`,
      [status, resolution_notes, status, disputeId]
    );
    
    res.json({
      success: true,
      message: 'Dispute status updated successfully'
    });
    
  } catch (error) {
    console.error('Update dispute status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update dispute'
    });
  }
};

module.exports = {
  createDispute,
  getUserDisputes,
  getDisputeDetails,
  updateDisputeStatus
};
