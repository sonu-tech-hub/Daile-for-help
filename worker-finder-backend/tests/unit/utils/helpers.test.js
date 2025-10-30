const {
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
  generateTransactionId,
  sanitizeUser,
  canReview,
  updateAverageRating
} = require('../../../src/utils/helpers');

describe('Helpers', () => {
  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testpassword';
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
      expect(hashed.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testpassword';
      const hashed = await hashPassword(password);

      const isValid = await comparePassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testpassword';
      const hashed = await hashPassword(password);

      const isValid = await comparePassword('wrongpassword', hashed);
      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token', () => {
      process.env.JWT_SECRET = 'test_secret';
      const token = generateToken(1, 'worker');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token', () => {
      process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
      const token = generateRefreshToken(1);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('generateOTP', () => {
    it('should generate 6-digit OTP', () => {
      const otp = generateOTP();

      expect(otp).toBeDefined();
      expect(typeof otp).toBe('string');
      expect(otp.length).toBe(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });
  });

  describe('generateReferralCode', () => {
    it('should generate referral code', () => {
      const code = generateReferralCode('test@example.com');

      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
      expect(code.length).toBe(9); // 3 chars from email + 6 hex chars
      expect(code.substring(0, 3)).toBe('TES'); // Uppercase first 3 chars
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Distance between (0,0) and (0,0) should be 0
      const distance = calculateDistance(0, 0, 0, 0);
      expect(distance).toBe(0);

      // Distance between two close points
      const distance2 = calculateDistance(28.6139, 77.2090, 19.0760, 72.8777); // Delhi to Mumbai
      expect(distance2).toBeGreaterThan(1000); // Should be around 1160 km
      expect(distance2).toBeLessThan(1200);
    });
  });

  describe('calculateCommission', () => {
    it('should calculate commission correctly', () => {
      process.env.PLATFORM_COMMISSION = '18';
      process.env.TRUST_SAFETY_FEE = '7';

      const result = calculateCommission(1000);

      expect(result.amount).toBe(1000);
      expect(result.commission).toBe(180); // 18% of 1000
      expect(result.trustFee).toBe(70); // 7% of 1000
      expect(result.netAmount).toBe(750); // 1000 - 180 - 70
    });
  });

  describe('formatDateTime', () => {
    it('should format date to MySQL datetime format', () => {
      const date = new Date('2023-01-01T12:30:45.123Z');
      const formatted = formatDateTime(date);

      expect(formatted).toBe('2023-01-01 12:30:45');
    });
  });

  describe('paginate', () => {
    it('should return pagination parameters', () => {
      const result = paginate(2, 20);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(20); // (2-1) * 20
    });

    it('should handle invalid inputs', () => {
      const result = paginate(-1, 150);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(100); // Max limit
      expect(result.offset).toBe(0);
    });
  });

  describe('generateTransactionId', () => {
    it('should generate transaction ID', () => {
      const id = generateTransactionId();

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.startsWith('TXN')).toBe(true);
      expect(id.length).toBeGreaterThan(10);
    });
  });

  describe('sanitizeUser', () => {
    it('should remove password from user object', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedpassword',
        user_type: 'worker'
      };

      const sanitized = sanitizeUser(user);

      expect(sanitized.id).toBe(1);
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.user_type).toBe('worker');
      expect(sanitized.password).toBeUndefined();
    });
  });

  describe('canReview', () => {
    let mockPromisePool;

    beforeEach(() => {
      mockPromisePool = {
        query: jest.fn()
      };
    });

    it('should return true if job is completed and not reviewed', async () => {
      mockPromisePool.query
        .mockResolvedValueOnce([[{ status: 'completed' }]]) // Job completed
        .mockResolvedValueOnce([[]]); // No existing review

      const result = await canReview(1, 1, mockPromisePool);

      expect(result.canReview).toBe(true);
    });

    it('should return false if job is not completed', async () => {
      mockPromisePool.query.mockResolvedValueOnce([[{ status: 'in_progress' }]]);

      const result = await canReview(1, 1, mockPromisePool);

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe('Job not completed yet');
    });

    it('should return false if already reviewed', async () => {
      mockPromisePool.query
        .mockResolvedValueOnce([[{ status: 'completed' }]])
        .mockResolvedValueOnce([[{ id: 1 }]]); // Existing review

      const result = await canReview(1, 1, mockPromisePool);

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe('Already reviewed this job');
    });
  });

  describe('updateAverageRating', () => {
    let mockPromisePool;

    beforeEach(() => {
      mockPromisePool = {
        query: jest.fn()
      };
    });

    it('should update average rating for worker', async () => {
      mockPromisePool.query
        .mockResolvedValueOnce([[{ avg_rating: 4.5 }]]) // Average rating
        .mockResolvedValueOnce([]); // Update profile

      const result = await updateAverageRating(1, 'worker', mockPromisePool);

      expect(result).toBe(4.5);
      expect(mockPromisePool.query).toHaveBeenCalledWith(
        'UPDATE worker_profiles SET average_rating = ? WHERE user_id = ?',
        [4.5, 1]
      );
    });

    it('should handle zero ratings', async () => {
      mockPromisePool.query
        .mockResolvedValueOnce([[{ avg_rating: null }]]) // No ratings
        .mockResolvedValueOnce([]);

      const result = await updateAverageRating(1, 'worker', mockPromisePool);

      expect(result).toBe(0);
    });
  });
});
