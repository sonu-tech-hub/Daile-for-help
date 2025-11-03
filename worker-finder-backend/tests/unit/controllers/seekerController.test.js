const seekerController = require('../../../src/controllers/seekerController');
const { promisePool } = require('../../../src/config/database');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../../src/config/cloudinary');

jest.mock('../../../src/config/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn()
}));

describe('Seeker Controller', () => {
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

  describe('updateSeekerProfile', () => {
    it('should update seeker profile successfully', async () => {
      const profileData = { full_name: 'Alice', city: 'Delhi' };
      mockReq.body = profileData;

      const mockProfile = { ...profileData, user_id: 1 };

      // Update query resolves to [{}], then select returns [[mockProfile]]
      promisePool.query
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([[mockProfile]]);

      await seekerController.updateSeekerProfile(mockReq, mockRes);

      expect(promisePool.query).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: mockProfile
      });
    });

    it('should handle update errors', async () => {
      mockReq.body = { full_name: 'Alice' };
      promisePool.query.mockRejectedValue(new Error('DB error'));

      await seekerController.updateSeekerProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update profile'
      });
    });
  });

  describe('uploadProfilePhoto', () => {
    it('should return 400 when no file uploaded', async () => {
      await seekerController.uploadProfilePhoto(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No file uploaded'
      });
    });

    it('should upload profile photo successfully', async () => {
      mockReq.file = { buffer: Buffer.from('fake image') };
      const mockProfile = [{ profile_photo: 'https://old/photo.jpg' }];
      const mockUpload = { secure_url: 'https://cloud/new.jpg' };

      promisePool.query.mockResolvedValueOnce([mockProfile]); // select
      uploadToCloudinary.mockResolvedValue(mockUpload);
      deleteFromCloudinary.mockResolvedValue({});
      promisePool.query.mockResolvedValueOnce([{}]); // update

      await seekerController.uploadProfilePhoto(mockReq, mockRes);

      expect(uploadToCloudinary).toHaveBeenCalledWith(mockReq.file.buffer, 'profiles', 'seeker_1');
      expect(promisePool.query).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile photo uploaded successfully',
        data: { url: mockUpload.secure_url }
      });
    });
  });

  describe('getSeekerProfile', () => {
    it('should return 400 for invalid seekerId', async () => {
      mockReq.params.seekerId = ':abc';
      await seekerController.getSeekerProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Invalid seekerId parameter. Use numeric id (e.g. /api/seekers/23)' });
    });

    it('should return 404 when seeker not found', async () => {
      mockReq.params.seekerId = '999';
      promisePool.query.mockResolvedValueOnce([[]]);

      await seekerController.getSeekerProfile(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Seeker not found' });
    });

    it('should return seeker profile successfully', async () => {
      mockReq.params.seekerId = '1';
      const mockSeeker = [{ user_id: 1, full_name: 'Alice' }];
      promisePool.query.mockResolvedValueOnce([mockSeeker]);

      await seekerController.getSeekerProfile(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockSeeker[0] });
    });
  });

  describe('getJobHistory', () => {
    it('should return 401 if not authenticated', async () => {
      mockReq.user = null;
      await seekerController.getJobHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized' });
    });

    it('should return job history successfully', async () => {
      mockReq.user = { id: 1 };
      const mockJobs = [{ id: 1 }];
      const mockCount = [{ total: 1 }];
      promisePool.query
        .mockResolvedValueOnce([mockJobs]) // jobs
        .mockResolvedValueOnce([mockCount]); // count

      await seekerController.getJobHistory(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});
