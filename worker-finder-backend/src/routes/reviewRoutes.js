const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken } = require('../middleware/auth');
const { validateReview } = require('../middleware/validation');
const { uploadDocuments } = require('../config/cloudinary');

// Protected routes
router.post(
  '/',
  verifyToken,
  uploadDocuments.array('photos', 5),
  validateReview,
  reviewController.createReview
);

router.get('/user/:userId', reviewController.getUserReviews);
router.get('/job/:jobId', verifyToken, reviewController.getJobReview);
router.put('/:reviewId/helpful', verifyToken, reviewController.markReviewHelpful);

module.exports = router;
