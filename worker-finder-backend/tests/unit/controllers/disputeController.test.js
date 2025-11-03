const disputeController = require('../../../src/controllers/disputeController');
const { promisePool } = require('../../../src/config/database');
const { uploadToCloudinary } = require('../../../src/config/cloudinary');

jest.mock('../../../src/config/cloudinary', () => ({
  uploadToCloudinary: jest.fn()
}));

describe('Dispute Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      user: { id: 1 },
      body: {},
      params: {},
      query: {},
      files: null
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

  describe('createDispute', () => {
    it('should return 404 when job not found', async () => {
      mockReq.body = { job_id: 123, against_user: 2, reason: 'test' };
      promisePool.query.mockResolvedValueOnce([[]]); // SELECT job

      await disputeController.createDispute(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Job not found or you are not part of this job'
      });
    });

    it('should return 400 when dispute already exists', async () => {
      mockReq.body = { job_id: 123, against_user: 2, reason: 'test' };
      promisePool.query
        .mockResolvedValueOnce([[{ id: 123 }]]) // job found
        .mockResolvedValueOnce([[{ id: 9 }]]); // existing dispute

      await disputeController.createDispute(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'A dispute already exists for this job'
      });
    });

    it('should create dispute successfully with files', async () => {
      mockReq.body = { job_id: 123, against_user: 2, reason: 'test', description: 'desc' };
      mockReq.files = [ { buffer: Buffer.from('a') }, { buffer: Buffer.from('b') } ];

      // job exists, no existing disputes
      promisePool.query
        .mockResolvedValueOnce([[{ id: 123 }]]) // job
        .mockResolvedValueOnce([[]]) // existing disputes
        // INSERT dispute
        .mockResolvedValueOnce([{ insertId: 10 }])
        // UPDATE jobs
        .mockResolvedValueOnce([{}])
        // INSERT notification
        .mockResolvedValueOnce([{}]);

      uploadToCloudinary
        .mockResolvedValueOnce({ secure_url: 'https://cloud/a.jpg' })
        .mockResolvedValueOnce({ secure_url: 'https://cloud/b.jpg' });

      await disputeController.createDispute(mockReq, mockRes);

      expect(uploadToCloudinary).toHaveBeenCalledTimes(2);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Dispute created successfully. Our team will review it shortly.',
        data: { dispute_id: 10 }
      });
    });

    it('should handle DB errors gracefully', async () => {
      mockReq.body = { job_id: 123, against_user: 2 };
      promisePool.query.mockRejectedValue(new Error('DB failure'));

      await disputeController.createDispute(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Failed to create dispute' });
    });
  });

  describe('getUserDisputes', () => {
    it('should return disputes list successfully', async () => {
      mockReq.user = { id: 1 };
      const mockDisputes = [{ id: 1, evidence_photos: '[]' }];
      const mockCount = [{ total: 1 }];

      promisePool.query
        .mockResolvedValueOnce([mockDisputes])
        .mockResolvedValueOnce([mockCount]);

      await disputeController.getUserDisputes(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getDisputeDetails', () => {
    it('should return 404 when dispute not found', async () => {
      mockReq.params.disputeId = '5';
      mockReq.user = { id: 1 };
      promisePool.query.mockResolvedValueOnce([[]]);

      await disputeController.getDisputeDetails(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Dispute not found' });
    });

    it('should return dispute details successfully', async () => {
      mockReq.params.disputeId = '5';
      mockReq.user = { id: 1 };
      const mockDispute = [{ id: 5, evidence_photos: '["a","b"]' }];
      promisePool.query.mockResolvedValueOnce([mockDispute]);

      await disputeController.getDisputeDetails(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: expect.objectContaining({ id: 5, evidence_photos: ['a','b'] }) });
    });
  });

  describe('updateDisputeStatus', () => {
    it('should update status successfully', async () => {
      mockReq.params.disputeId = '7';
      mockReq.body = { status: 'resolved', resolution_notes: 'ok' };

      promisePool.query.mockResolvedValueOnce([{}]);

      await disputeController.updateDisputeStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Dispute status updated successfully' });
    });

    it('should handle update errors', async () => {
      mockReq.params.disputeId = '7';
      mockReq.body = { status: 'resolved' };
      promisePool.query.mockRejectedValueOnce(new Error('fail'));

      await disputeController.updateDisputeStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Failed to update dispute' });
    });
  });
});
