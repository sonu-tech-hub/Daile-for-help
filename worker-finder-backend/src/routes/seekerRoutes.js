const express = require('express');
const router = express.Router();
const seekerController = require('../controllers/seekerController');
const { verifyToken, isSeeker } = require('../middleware/auth');
const { validateSeekerProfile } = require('../middleware/validation');
const { uploadProfilePhoto } = require('../config/cloudinary');

// Public routes
router.get('/:seekerId', seekerController.getSeekerProfile);

// Protected routes (seeker only)
router.put(
  '/profile',
  verifyToken,
  isSeeker,
  validateSeekerProfile,
  seekerController.updateSeekerProfile
);

router.post(
  '/profile-photo',
  verifyToken,
  isSeeker,
  uploadProfilePhoto.single('photo'),
  seekerController.uploadProfilePhoto
);

router.get(
  '/dashboard/stats',
  verifyToken,
  isSeeker,
  seekerController.getSeekerStats
);

router.get(
  '/jobs/history',
  verifyToken,
  isSeeker,
  seekerController.getJobHistory
);

module.exports = router;
