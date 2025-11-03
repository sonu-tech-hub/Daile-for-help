const { promisePool } = require('../config/database');
const { uploadToCloudinary } = require('../config/cloudinary');
const { calculateCommission, formatDateTime, paginate } = require('../utils/helpers');

// Create job (Seeker creates a job posting)
const createJob = async (req, res) => {
  try {
    const seekerId = req.user.id;
    const {
      title,
      description,
      category_id,
      budget,
      location,
      latitude,
      longitude,
      scheduled_date,
      worker_id  // Optional: Direct hire to specific worker
    } = req.body;

    // Validate worker_id (if provided). If invalid, fall back to creating the
    // job as an open job (worker_id -> NULL) instead of failing the request.
    let assignedWorkerId = worker_id || null;
    let workerAssigned = false;
    if (worker_id) {
      const [workerRows] = await promisePool.query(
        'SELECT id, user_type, is_active FROM users WHERE id = ?',
        [worker_id]
      );

      if (workerRows.length === 0 || workerRows[0].user_type !== 'worker' || !workerRows[0].is_active) {
        console.warn(`Requested worker_id=${worker_id} is invalid or not available; creating job as open`);
        assignedWorkerId = null; // create job without assigning
        workerAssigned = false;
      } else {
        workerAssigned = true;
      }
    }

    // Validate category_id (optional) to provide clearer error messages
    if (category_id) {
      const [catRows] = await promisePool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
      if (catRows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid category_id' });
      }
    }

      

    // Calculate commission
    const commission = calculateCommission(parseFloat(budget));

    // Insert job
    const [result] = await promisePool.query(
      `INSERT INTO jobs (
        seeker_id, worker_id, category_id, title, description, 
        budget, location, latitude, longitude, scheduled_date,
        commission_amount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        seekerId,
        assignedWorkerId,
        category_id || null,
        title,
        description,
        budget,
        location,
        latitude,
        longitude,
        scheduled_date ? formatDateTime(new Date(scheduled_date)) : null,
        commission.commission,
        assignedWorkerId ? 'assigned' : 'open'
      ]
    );

    const jobId = result.insertId;

    // Update seeker profile
    await promisePool.query(
      'UPDATE seeker_profiles SET total_jobs_posted = total_jobs_posted + 1 WHERE user_id = ?',
      [seekerId]
    );

    // If a valid worker was assigned, notify them
    if (workerAssigned && assignedWorkerId) {
      await promisePool.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES (?, ?, ?, ?, ?)`,
        [assignedWorkerId, 'New Job Assigned', `You have been assigned a new job: ${title}`, 'job', jobId]
      );
    }

    res.status(201).json({
      success: true,
      message: workerAssigned ? 'Job created and assigned to worker' : 'Job posted successfully',
      data: {
        job_id: jobId,
        status: workerAssigned ? 'assigned' : 'open',
        commission_details: commission
      }
    });

  } catch (error) {
    console.error('Create job error:', error);
    // Better error for FK violations
    if (error && error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ success: false, message: 'Invalid reference provided (worker_id/category_id may not exist)' });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create job'
    });
  }
};

// Get all jobs (with filters)
const getAllJobs = async (req, res) => {
  try {
    const {
      status,
      category_id,
      latitude,
      longitude,
      radius = 25,
      min_budget,
      max_budget,
      page = 1,
      limit = 20
    } = req.query;

    const { limit: limitNum, offset } = paginate(page, limit);

    let query = `
      SELECT 
        j.*,
        c.name as category_name,
        sp.full_name as seeker_name,
        sp.profile_photo as seeker_photo,
        sp.city as seeker_city,
        wp.full_name as worker_name,
        wp.profile_photo as worker_photo
        ${latitude && longitude ? `,
          (6371 * acos(cos(radians(?)) * cos(radians(j.latitude)) * 
          cos(radians(j.longitude) - radians(?)) + 
          sin(radians(?)) * sin(radians(j.latitude)))) AS distance
        ` : ', 0 AS distance'}
      FROM jobs j
      LEFT JOIN categories c ON j.category_id = c.id
      LEFT JOIN seeker_profiles sp ON j.seeker_id = sp.user_id
      LEFT JOIN worker_profiles wp ON j.worker_id = wp.user_id
      WHERE 1=1
    `;

    const params = [];

    // Add distance params if location provided
    if (latitude && longitude) {
      params.push(latitude, longitude, latitude);
    }

    // Filters
    if (status) {
      query += ' AND j.status = ?';
      params.push(status);
    }

    if (category_id) {
      query += ' AND j.category_id = ?';
      params.push(category_id);
    }

    if (min_budget) {
      query += ' AND j.budget >= ?';
      params.push(parseFloat(min_budget));
    }

    if (max_budget) {
      query += ' AND j.budget <= ?';
      params.push(parseFloat(max_budget));
    }

    // Distance filter
    if (latitude && longitude) {
      query += ' HAVING distance <= ?';
      params.push(parseFloat(radius));
    }

    // Sort by distance if location provided, else by creation date
    query += latitude && longitude 
      ? ' ORDER BY distance ASC, j.created_at DESC'
      : ' ORDER BY j.created_at DESC';

    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [jobs] = await promisePool.query(query, params);

    // Get total count
    const [countResult] = await promisePool.query(
      'SELECT COUNT(*) as total FROM jobs WHERE 1=1' +
      (status ? ' AND status = ?' : '') +
      (category_id ? ' AND category_id = ?' : ''),
      [...(status ? [status] : []), ...(category_id ? [category_id] : [])]
    );

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total: countResult[0].total,
          total_pages: Math.ceil(countResult[0].total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs'
    });
  }
};

// Get job by ID
const getJobById = async (req, res) => {
  try {
    const rawJobId = req.params.jobId;
    // sanitize possible leading colon (clients sometimes send ':1')
    const jobId = typeof rawJobId === 'string' ? rawJobId.replace(/^:/, '') : rawJobId;
    if (!jobId || !/^\d+$/.test(String(jobId))) {
      return res.status(400).json({ success: false, message: 'Invalid jobId parameter. Use numeric id (e.g. /api/jobs/23)' });
    }

    const [jobs] = await promisePool.query(
      `SELECT 
        j.*,
        c.name as category_name,
        sp.full_name as seeker_name,
        sp.profile_photo as seeker_photo,
        su.mobile as seeker_mobile,
        sp.city as seeker_city,
        sp.address as seeker_address,
        wp.full_name as worker_name,
        wp.profile_photo as worker_photo,
        wu.mobile as worker_mobile,
        wp.profession as worker_profession,
        wp.experience_years as worker_experience
      FROM jobs j
      LEFT JOIN categories c ON j.category_id = c.id
      LEFT JOIN seeker_profiles sp ON j.seeker_id = sp.user_id
      LEFT JOIN users su ON sp.user_id = su.id
      LEFT JOIN worker_profiles wp ON j.worker_id = wp.user_id
      LEFT JOIN users wu ON wp.user_id = wu.id
      WHERE j.id = ?`,
      [jobId]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: jobs[0]
    });

  } catch (error) {
    console.error('Get job by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job details'
    });
  }
};

// Worker applies for a job
const applyForJob = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    const workerId = req.user.id;
    const { jobId } = req.params;
    const { proposal_message, quoted_price } = req.body;

    await connection.beginTransaction();

    // Check if job exists and is open
    const [jobs] = await connection.query(
      'SELECT * FROM jobs WHERE id = ? AND status = "open"',
      [jobId]
    );

    if (jobs.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Job not found or not available'
      });
    }

    // Check if already applied
    const [existingApplications] = await connection.query(
      'SELECT id FROM job_applications WHERE job_id = ? AND worker_id = ?',
      [jobId, workerId]
    );

    if (existingApplications.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }

    // Create application
    const [result] = await connection.query(
      `INSERT INTO job_applications (job_id, worker_id, proposal_message, quoted_price, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [jobId, workerId, proposal_message, quoted_price || jobs[0].budget]
    );

    // Notify seeker
    await connection.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [jobs[0].seeker_id, 'New Job Application', 'A worker has applied for your job', 'job', jobId]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application_id: result.insertId
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Apply for job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply for job'
    });
  } finally {
    connection.release();
  }
};

// Seeker accepts worker application (assigns job)
const acceptApplication = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    const seekerId = req.user.id;
    const { applicationId } = req.params;

    await connection.beginTransaction();

    // Get application details
    const [applications] = await connection.query(
      `SELECT ja.*, j.seeker_id, j.id as job_id
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.id
       WHERE ja.id = ? AND j.seeker_id = ?`,
      [applicationId, seekerId]
    );

    if (applications.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Application not found or unauthorized'
      });
    }

    const application = applications[0];

    // Update job - assign worker
    await connection.query(
      `UPDATE jobs SET 
        worker_id = ?, 
        status = 'assigned',
        budget = ?
       WHERE id = ?`,
      [application.worker_id, application.quoted_price, application.job_id]
    );

    // Update application status
    await connection.query(
      'UPDATE job_applications SET status = "accepted" WHERE id = ?',
      [applicationId]
    );

    // Reject other applications for this job
    await connection.query(
      'UPDATE job_applications SET status = "rejected" WHERE job_id = ? AND id != ?',
      [application.job_id, applicationId]
    );

    // Notify worker
    await connection.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [application.worker_id, 'Application Accepted', 'Your job application has been accepted', 'job', application.job_id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Worker assigned successfully',
      data: {
        job_id: application.job_id,
        worker_id: application.worker_id
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Accept application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept application'
    });
  } finally {
    connection.release();
  }
};

// Get job applications (for seeker to see who applied)
const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const [jobs] = await promisePool.query(
      'SELECT seeker_id FROM jobs WHERE id = ?',
      [jobId]
    );

    if (jobs.length === 0 || jobs[0].seeker_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    const [applications] = await promisePool.query(
      `SELECT 
        ja.*,
        wp.full_name as worker_name,
        wp.profile_photo as worker_photo,
        wp.profession,
        wp.experience_years,
        wp.average_rating,
        wp.total_jobs_completed,
        u.mobile as worker_mobile
      FROM job_applications ja
      JOIN worker_profiles wp ON ja.worker_id = wp.user_id
      JOIN users u ON wp.user_id = u.id
      WHERE ja.job_id = ?
      ORDER BY ja.created_at DESC`,
      [jobId]
    );

    res.json({
      success: true,
      data: applications
    });

  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications'
    });
  }
};

// Update job status
const updateJobStatus = async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    const { jobId } = req.params;
    const { status, completion_notes } = req.body;
    const userId = req.user.id;

    await connection.beginTransaction();

    // Get job details
    const [jobs] = await connection.query(
      'SELECT * FROM jobs WHERE id = ? AND (seeker_id = ? OR worker_id = ?)',
      [jobId, userId, userId]
    );

    if (jobs.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Job not found or unauthorized'
      });
    }

    const job = jobs[0];

    // Status transition validation
    const validTransitions = {
      'assigned': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'disputed'],
      'completed': ['disputed'],
      'open': ['cancelled']
    };

    if (!validTransitions[job.status]?.includes(status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${job.status} to ${status}`
      });
    }

    // Update job
    const updateFields = ['status = ?'];
    const updateParams = [status];

    if (status === 'completed') {
      updateFields.push('completion_date = NOW()');
      updateFields.push('payment_status = "pending"');
      
      // Update worker stats
      if (job.worker_id) {
        await connection.query(
          `UPDATE worker_profiles SET 
            total_jobs_completed = total_jobs_completed + 1,
            total_earnings = total_earnings + ?
           WHERE user_id = ?`,
          [job.budget - job.commission_amount, job.worker_id]
        );
      }

      // Update seeker stats
      await connection.query(
        'UPDATE seeker_profiles SET total_amount_spent = total_amount_spent + ? WHERE user_id = ?',
        [job.budget, job.seeker_id]
      );
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateParams.push(jobId);

    await connection.query(
      `UPDATE jobs SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Notify the other party
    const notifyUserId = userId === job.seeker_id ? job.worker_id : job.seeker_id;
    if (notifyUserId) {
      await connection.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES (?, ?, ?, ?, ?)`,
        [notifyUserId, 'Job Status Updated', `Job status changed to ${status}`, 'job', jobId]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Job status updated to ${status}`,
      data: {
        job_id: jobId,
        status
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Update job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job status'
    });
  } finally {
    connection.release();
  }
};

// Get my jobs (worker or seeker)
const getMyJobs = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.user_type;
    const { status, page = 1, limit = 20 } = req.query;

    const { limit: limitNum, offset } = paginate(page, limit);

    const field = userType === 'worker' ? 'worker_id' : 'seeker_id';
    
    let query = `
      SELECT 
        j.*,
        c.name as category_name,
        sp.full_name as seeker_name,
        sp.profile_photo as seeker_photo,
        wp.full_name as worker_name,
        wp.profile_photo as worker_photo
      FROM jobs j
      LEFT JOIN categories c ON j.category_id = c.id
      LEFT JOIN seeker_profiles sp ON j.seeker_id = sp.user_id
      LEFT JOIN worker_profiles wp ON j.worker_id = wp.user_id
      WHERE j.${field} = ?
    `;

    const params = [userId];

    if (status) {
      query += ' AND j.status = ?';
      params.push(status);
    }

    query += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const [jobs] = await promisePool.query(query, params);

    // Get total count
    const [countResult] = await promisePool.query(
      `SELECT COUNT(*) as total FROM jobs WHERE ${field} = ?` + (status ? ' AND status = ?' : ''),
      status ? [userId, status] : [userId]
    );

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          page: parseInt(page),
          limit: limitNum,
          total: countResult[0].total,
          total_pages: Math.ceil(countResult[0].total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get my jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs'
    });
  }
};

// Cancel job
const cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { cancellation_reason } = req.body;
    const userId = req.user.id;

    // Get job
    const [jobs] = await promisePool.query(
      'SELECT * FROM jobs WHERE id = ? AND (seeker_id = ? OR worker_id = ?)',
      [jobId, userId, userId]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or unauthorized'
      });
    }

    const job = jobs[0];

    // Can only cancel if not completed
    if (job.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed job'
      });
    }

    // Update status
    await promisePool.query(
      'UPDATE jobs SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [jobId]
    );

    // Notify other party
    const notifyUserId = userId === job.seeker_id ? job.worker_id : job.seeker_id;
    if (notifyUserId) {
      await promisePool.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES (?, ?, ?, ?, ?)`,
        [notifyUserId, 'Job Cancelled', cancellation_reason || 'Job has been cancelled', 'job', jobId]
      );
    }

    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel job'
    });
  }
};

module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  applyForJob,
  acceptApplication,
  getJobApplications,
  updateJobStatus,
  getMyJobs,
  cancelJob
};
