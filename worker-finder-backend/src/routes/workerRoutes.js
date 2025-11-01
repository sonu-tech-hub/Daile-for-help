const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { verifyToken, isWorker } = require('../middleware/auth');
const { validateWorkerProfile, validateWorkerSearch } = require('../middleware/validation');
const { uploadProfilePhoto, uploadDocuments } = require('../config/cloudinary');

// Public routes
router.get('/search', validateWorkerSearch, workerController.searchWorkers);
router.get('/:workerId', workerController.getWorkerProfile);

// Protected routes (worker only)
router.put(
  '/profile',
  verifyToken,
  isWorker,
  validateWorkerProfile,
  workerController.updateWorkerProfile
);

router.post(
  '/profile-photo',
  verifyToken,
  isWorker,
  // accept either 'photo' or 'image' field to be tolerant of client variations
  uploadProfilePhoto.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 }
  ]),
  workerController.uploadProfilePhoto
);

router.post(
  '/verification-proof',
  verifyToken,
  isWorker,
  uploadDocuments.single('document'),
  workerController.uploadVerificationProof
);

router.get(
  '/dashboard/stats',
  verifyToken,
  isWorker,
  workerController.getWorkerStats
);

router.put(
  '/availability',
  verifyToken,
  isWorker,
  workerController.updateAvailability
);

module.exports = router;
