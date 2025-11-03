const mysql = require('mysql2/promise');
require('dotenv').config();

const initDatabase = async () => {
  let connection;
  
  try {
    // Connect without database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('📦 Initializing database...');

    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'worker_finder_db'}`);
    console.log('✅ Database created/verified');

    // Use the database
    await connection.query(`USE ${process.env.DB_NAME || 'worker_finder_db'}`);

    // Create Users table (Master table for authentication)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        mobile VARCHAR(15) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        user_type ENUM('worker', 'seeker') NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_mobile (mobile),
        INDEX idx_user_type (user_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Users table created');

    // Create Worker Profiles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS worker_profiles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        whatsapp_number VARCHAR(15),
        profile_photo VARCHAR(500),
        profession VARCHAR(100) NOT NULL,
        experience_years DECIMAL(4,1) DEFAULT 0,
        hourly_rate DECIMAL(10,2) DEFAULT 0,
        bio TEXT,
        skills JSON,
        certifications JSON,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        verification_proof VARCHAR(500),
        aadhar_verified BOOLEAN DEFAULT FALSE,
        police_verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        skill_test_passed BOOLEAN DEFAULT FALSE,
        availability_status ENUM('available', 'busy', 'offline') DEFAULT 'available',
        total_jobs_completed INT DEFAULT 0,
        average_rating DECIMAL(3,2) DEFAULT 0.00,
        total_earnings DECIMAL(12,2) DEFAULT 0,
        referral_code VARCHAR(20) UNIQUE,
        referred_by VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_profession (profession),
        INDEX idx_city (city),
        INDEX idx_location (latitude, longitude),
        INDEX idx_rating (average_rating),
        INDEX idx_availability (availability_status),
        INDEX idx_referral (referral_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Worker Profiles table created');

    // Create Seeker Profiles table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS seeker_profiles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        profile_photo VARCHAR(500),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        total_jobs_posted INT DEFAULT 0,
        total_amount_spent DECIMAL(12,2) DEFAULT 0,
        average_rating DECIMAL(3,2) DEFAULT 0.00,
        referral_code VARCHAR(20) UNIQUE,
        referred_by VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_city (city),
        INDEX idx_location (latitude, longitude),
        INDEX idx_referral (referral_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Seeker Profiles table created');

    // Create Categories table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Categories table created');

    // Insert default categories
    await connection.query(`
      INSERT IGNORE INTO categories (name, description) VALUES
      ('Plumber', 'Water supply, drainage, and pipe fitting services'),
      ('Electrician', 'Electrical installation, repair, and maintenance'),
      ('Carpenter', 'Woodwork, furniture making, and repair services'),
      ('Painter', 'Interior and exterior painting services'),
      ('Mason', 'Construction and bricklaying services'),
      ('House Cleaning', 'Residential cleaning services'),
      ('Gardener', 'Garden maintenance and landscaping'),
      ('AC Technician', 'AC installation, repair, and servicing'),
      ('Mechanic', 'Vehicle repair and maintenance'),
      ('Welder', 'Metal welding and fabrication services')
    `);
    console.log('✅ Default categories inserted');

    // Create Jobs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        seeker_id INT NOT NULL,
        worker_id INT,
        category_id INT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        budget DECIMAL(10,2),
        location TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        status ENUM('open', 'assigned', 'in_progress', 'completed', 'cancelled', 'disputed') DEFAULT 'open',
        scheduled_date DATETIME,
        completion_date DATETIME,
        payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
        commission_amount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (seeker_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_seeker (seeker_id),
        INDEX idx_worker (worker_id),
        INDEX idx_location (latitude, longitude)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Jobs table created');

    // Create Reviews table (Two-way rating system)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT PRIMARY KEY AUTO_INCREMENT,
        job_id INT NOT NULL,
        reviewer_id INT NOT NULL,
        reviewee_id INT NOT NULL,
        rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT,
        punctuality_rating DECIMAL(2,1),
        quality_rating DECIMAL(2,1),
        behavior_rating DECIMAL(2,1),
        photos JSON,
        is_verified BOOLEAN DEFAULT FALSE,
        helpful_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_reviewee (reviewee_id),
        INDEX idx_rating (rating),
        UNIQUE KEY unique_job_reviewer (job_id, reviewer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Reviews table created');

    // Create Messages table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        job_id INT,
        message_text TEXT NOT NULL,
        media_url VARCHAR(500),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
        INDEX idx_sender (sender_id),
        INDEX idx_receiver (receiver_id),
        INDEX idx_conversation (sender_id, receiver_id),
        INDEX idx_job (job_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Messages table created');

    // Create Disputes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        job_id INT NOT NULL,
        raised_by INT NOT NULL,
        against_user INT NOT NULL,
        reason TEXT NOT NULL,
        description TEXT,
        evidence_photos JSON,
        status ENUM('open', 'under_review', 'resolved', 'closed') DEFAULT 'open',
        resolution_notes TEXT,
        resolved_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (against_user) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_job (job_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Disputes table created');

    // Create OTP table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id INT PRIMARY KEY AUTO_INCREMENT,
        mobile VARCHAR(15) NOT NULL,
        email VARCHAR(255),
        otp VARCHAR(6) NOT NULL,
        purpose ENUM('registration', 'login', 'password_reset') NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_mobile (mobile),
        INDEX idx_email (email),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ OTP table created');

    // Create Referrals table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id INT PRIMARY KEY AUTO_INCREMENT,
        referrer_user_id INT NOT NULL,
        referred_user_id INT NOT NULL,
        referral_code VARCHAR(20) NOT NULL,
        bonus_amount DECIMAL(10,2) DEFAULT 0,
        status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
        completed_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_referrer (referrer_user_id),
        INDEX idx_code (referral_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Referrals table created');

    // Create Payments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        job_id INT NOT NULL,
        payer_id INT NOT NULL,
        payee_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        commission_amount DECIMAL(10,2) DEFAULT 0,
        trust_fee DECIMAL(10,2) DEFAULT 0,
        net_amount DECIMAL(10,2) NOT NULL,
        payment_method ENUM('upi', 'card', 'wallet', 'cash') DEFAULT 'upi',
        transaction_id VARCHAR(100) UNIQUE,
        status ENUM('pending', 'processing', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        payment_gateway_response JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (payee_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_transaction (transaction_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Payments table created');

    // Create Notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('job', 'payment', 'review', 'system', 'referral') DEFAULT 'system',
        reference_id INT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_read_status (is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Notifications table created');

    // Create Worker Availability Schedule table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS worker_availability (
        id INT PRIMARY KEY AUTO_INCREMENT,
        worker_id INT NOT NULL,
        day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_worker (worker_id),
        INDEX idx_day (day_of_week)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Worker Availability table created');

    // Create Job Applications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS job_applications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        job_id INT NOT NULL,
        worker_id INT NOT NULL,
        proposal_message TEXT NOT NULL,
        quoted_price DECIMAL(10,2),
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_job (job_id),
        INDEX idx_worker (worker_id),
        INDEX idx_status (status),
        UNIQUE KEY unique_job_worker (job_id, worker_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Job Applications table created');

    // Sample referrals
    await connection.query(`
      INSERT IGNORE INTO referrals (referrer_user_id, referred_user_id, referral_code, bonus_amount, status, completed_at) VALUES
      (1, 2, 'REF123', 100, 'completed', NOW()),
      (1, 3, 'REF123', 100, 'pending', NULL),
      (2, 1, 'SEEK123', 100, 'completed', NOW()),
      (3, 1, 'REF456', 100, 'pending', NULL)
    `);
    console.log('✅ Sample referrals inserted');

    console.log('🎉 Database initialization completed successfully!');
    console.log('📊 All tables created with proper indexes and relationships');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run initialization
initDatabase()
  .then(() => {
    console.log('✅ Database setup complete. You can now start the server.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
