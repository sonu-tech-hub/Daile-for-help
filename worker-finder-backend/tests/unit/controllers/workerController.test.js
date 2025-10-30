const workerController = require('../../../src/controllers/workerController');
const { promisePool } = require('../../../src/config/database');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../../src/config/cloudinary');

// Mock Cloudinary functions
jest.mock('../../../src/config/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn()
}));

describe('Worker Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      user: { id: 1 },
      params: {},
      query: {},
      body: {},
      file: null
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    promisePool.query = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateWorkerProfile', () => {
    it('should update worker profile successfully', async () => {
      const profileData = {
        full_name: 'John Doe',
        profession: 'Electrician',
        experience_years: 5,
        hourly_rate: 500,
        skills: ['wiring', 'repairs'],
        certifications: ['cert1'],
        address: '123 Main St',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        latitude: 28.6139,
        longitude: 77.2090,
        availability_status: 'available'
      };

      mockReq.body = profileData;

      const mockProfile = { ...profileData, user_id: 1 };

      promisePool.query
        .mockResolvedValueOnce([{}]) // Update query
        .mockResolvedValueOnce([[mockProfile]]); // Get updated profile

      await workerController.updateWorkerProfile(mockReq, mockRes);

      expect(promisePool.query).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: mockProfile
      });
    });

    it('should handle update errors', async () => {
      mockReq.body = { full_name: 'John Doe' };

      promisePool.query.mockRejectedValue(new Error('Database error'));

      await workerController.updateWorkerProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update profile'
      });
    });
  });

  describe('uploadProfilePhoto', () => {
    it('should upload profile photo successfully', async () => {
      mockReq.file = { buffer: Buffer.from('fake image data') };

      const mockProfile = { profile_photo: 'old_photo_url' };
      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/new_photo.jpg',
        public_id: 'worker_1'
      };

      promisePool.query.mockResolvedValueOnce([[mockProfile]]);
      uploadToCloudinary.mockResolvedValue(mockUploadResult);
      deleteFromCloudinary.mockResolvedValue({});

      await workerController.uploadProfilePhoto(mockReq, mockRes);

      expect(uploadToCloudinary).toHaveBeenCalledWith(
        mockReq.file.buffer,
        'profiles',
        'worker_1'
      );
      expect(promisePool.query).toHaveBeenCalledWith(
        'UPDATE worker_profiles SET profile_photo = ? WHERE user_id = ?',
        [mockUploadResult.secure_url, 1]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile photo uploaded successfully',
        data: {
          url: mockUploadResult.secure_url,
          public_id: mockUploadResult.public_id
        }
      });
    });

    it('should return error if no file uploaded', async () => {
      await workerController.uploadProfilePhoto(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No file uploaded'
      });
    });
  });

  describe('uploadVerificationProof', () => {
    it('should upload verification proof successfully', async () => {
      mockReq.file = { buffer: Buffer.from('fake proof data') };

      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/proof.jpg'
      };

      uploadToCloudinary.mockResolvedValue(mockUploadResult);

      await workerController.uploadVerificationProof(mockReq, mockRes);

      expect(uploadToCloudinary).toHaveBeenCalledWith(
        mockReq.file.buffer,
        'verification',
        'proof_1'
      );
      expect(promisePool.query).toHaveBeenCalledWith(
        'UPDATE worker_profiles SET verification_proof = ?, aadhar_verified = TRUE WHERE user_id = ?',
        [mockUploadResult.secure_url, 1]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Verification proof uploaded successfully',
        data: { url: mockUploadResult.secure_url }
      });
    });
  });

  describe('getWorkerProfile', () => {
    it('should get worker profile successfully', async () => {
      mockReq.params.workerId = '1';

      const mockWorker = {
        user_id: 1,
        full_name: 'John Doe',
        skills: '["skill1","skill2"]',
        certifications: '["cert1"]',
        email: 'john@example.com',
        is_verified: true
      };

      const mockReviews = [
        { id: 1, rating: 5, comment: 'Great work!' }
      ];

      promisePool.query
        .mockResolvedValueOnce([[mockWorker]]) // Worker profile
        .mockResolvedValueOnce([mockReviews]); // Reviews

      await workerController.getWorkerProfile(mockReq, mockRes);

      expect(promisePool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT wp.*, u.email'),
        ['1']
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          profile: {
            ...mockWorker,
            skills: ['skill1', 'skill2'],
            certifications: ['cert1']
          },
          reviews: mockReviews,
          review_count: 1
        }
      });
    });

    it('should return 404 if worker not found', async () => {
      mockReq.params.workerId = '999';

      promisePool.query.mockResolvedValueOnce([[]]); // No worker found

      await workerController.getWorkerProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Worker not found'
      });
    });
  });

  describe('searchWorkers', () => {
    it('should search workers successfully', async () => {
      mockReq.query = {
        latitude: '28.6139',
        longitude: '77.2090',
        radius: '10',
        profession: 'Electrician',
        page: '1',
        limit: '10'
      };

      const mockWorkers = [
        {
          user_id: 1,
          full_name: 'John Doe',
          skills: '["skill1"]',
          certifications: '["cert1"]',
          distance: 5.5
        }
      ];

      const mockCount = [{ total: 1 }];

      promisePool.query
        .mockResolvedValueOnce([mockWorkers]) // Workers query
        .mockResolvedValueOnce([mockCount]); // Count query

      await workerController.searchWorkers(mockReq, mockRes);

      expect(promisePool.query).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          workers: [{
            ...mockWorkers[0],
            skills: ['skill1'],
            certifications: ['cert1'],
            distance: 5.5
          }],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            total_pages: 1
          },
          filters: expect.objectContaining({
            latitude: '28.6139',
            longitude: '77.2090',
            radius: 10,
            profession: 'Electrician'
          })
        }
      });
    });
  });

  describe('getWorkerStats', () => {
    it('should get worker stats successfully', async () => {
      const mockProfile = {
        user_id: 1,
        full_name: 'John Doe',
        skills: '["skill1"]',
        certifications: '["cert1"]',
        average_rating: 4.5,
        total_earnings: 5000
      };

      const mockJobStats = {
        total_jobs: 10,
        completed_jobs: 8,
        active_jobs: 1,
        pending_jobs: 1
      };

      const mockEarnings = [{ monthly_earnings: 1500 }];
      const mockReviews = [{ id: 1, rating: 5 }];

      promisePool.query
        .mockResolvedValueOnce([[mockProfile]]) // Profile
        .mockResolvedValueOnce([[mockJobStats]]) // Job stats
        .mockResolvedValueOnce([mockEarnings]) // Earnings
        .mockResolvedValueOnce([mockReviews]); // Reviews

      await workerController.getWorkerStats(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          profile: {
            ...mockProfile,
            skills: ['skill1'],
            certifications: ['cert1']
          },
          stats: {
            ...mockJobStats,
            monthly_earnings: '1500.00',
            average_rating: 4.5,
            total_earnings: 5000
          },
          recent_reviews: mockReviews
        }
      });
    });
  });

  describe('updateAvailability', () => {
    it('should update availability successfully', async () => {
      mockReq.body = { availability_status: 'busy' };

      promisePool.query.mockResolvedValueOnce([{}]);

      await workerController.updateAvailability(mockReq, mockRes);

      expect(promisePool.query).toHaveBeenCalledWith(
        'UPDATE worker_profiles SET availability_status = ? WHERE user_id = ?',
        ['busy', 1]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Availability updated successfully',
        data: { availability_status: 'busy' }
      });
    });
  });
});
