const authMiddleware = require('../../../src/middleware/auth');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../../../src/config/database');

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    promisePool.query = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should verify token and attach user to request', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        user_type: 'worker',
        is_verified: true,
        is_active: true
      };

      const token = jwt.sign(
        { userId: 1, userType: 'worker' },
        process.env.JWT_SECRET || 'test_secret'
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      promisePool.query.mockResolvedValueOnce([[mockUser]]);

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 if no token provided', async () => {
      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. No token provided.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid_token';

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 1, userType: 'worker' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '-1h' }
      );

      mockReq.headers.authorization = `Bearer ${expiredToken}`;

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired. Please login again.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if user not found', async () => {
      const token = jwt.sign(
        { userId: 999, userType: 'worker' },
        process.env.JWT_SECRET || 'test_secret'
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      promisePool.query.mockResolvedValueOnce([[]]); // No user found

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 if account is deactivated', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        user_type: 'worker',
        is_verified: true,
        is_active: false
      };

      const token = jwt.sign(
        { userId: 1, userType: 'worker' },
        process.env.JWT_SECRET || 'test_secret'
      );

      mockReq.headers.authorization = `Bearer ${token}`;
      promisePool.query.mockResolvedValueOnce([[mockUser]]);

      await authMiddleware.verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is deactivated'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('isWorker', () => {
    it('should allow worker to proceed', () => {
      mockReq.user = { user_type: 'worker' };

      authMiddleware.isWorker(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny non-worker access', () => {
      mockReq.user = { user_type: 'seeker' };

      authMiddleware.isWorker(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Worker account required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('isSeeker', () => {
    it('should allow seeker to proceed', () => {
      mockReq.user = { user_type: 'seeker' };

      authMiddleware.isSeeker(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny non-seeker access', () => {
      mockReq.user = { user_type: 'worker' };

      authMiddleware.isSeeker(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Seeker account required.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('isVerified', () => {
    it('should allow verified user to proceed', () => {
      mockReq.user = { is_verified: true };

      authMiddleware.isVerified(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny unverified user access', () => {
      mockReq.user = { is_verified: false };

      authMiddleware.isVerified(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please verify your account first'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
