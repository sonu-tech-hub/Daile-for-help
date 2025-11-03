const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

const { verifyToken, isSeeker, isWorker } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Validation middleware
const validateJobCreation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Title is required (5-255 characters)'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description is required (10-2000 characters)'),
  body('budget')
    .isFloat({ min: 100 })
    .withMessage('Budget must be at least ₹100'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Location too long'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude required'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude required'),
  body('scheduled_date')
    .optional()
    .isISO8601()
    .withMessage('Valid date required (ISO 8601 format)'),
  body('category_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid category ID required'),
  body('worker_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid worker ID required'),
  handleValidationErrors
];

const validateJobApplication = [
  body('proposal_message')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Proposal message is required (20-1000 characters)'),
  body('quoted_price')
    .optional()
    .isFloat({ min: 100 })
    .withMessage('Quoted price must be at least ₹100'),
  handleValidationErrors
];

const validateStatusUpdate = [
  body('status')
    .isIn(['assigned', 'in_progress', 'completed', 'cancelled', 'disputed'])
    .withMessage('Invalid status'),
  body('completion_notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Completion notes too long'),
  handleValidationErrors
];

// Public routes
router.get('/', jobController.getAllJobs);
router.get('/:jobId', jobController.getJobById);

// Seeker routes (only seekers can create jobs)
router.post(
  '/',
  verifyToken,
  isSeeker,
  validateJobCreation,
  jobController.createJob
);

router.get(
  '/:jobId/applications',
  verifyToken,
  isSeeker,
  jobController.getJobApplications
);

router.put(
  '/applications/:applicationId/accept',
  verifyToken,
  isSeeker,
  jobController.acceptApplication
);

// Worker routes (only workers can apply)
router.post(
  '/:jobId/apply',
  verifyToken,
  isWorker,
  validateJobApplication,
  jobController.applyForJob
);

// Common routes (both can access)
router.get(
  '/my/jobs',
  verifyToken,
  jobController.getMyJobs
);

router.put(
  '/:jobId/status',
  verifyToken,
  validateStatusUpdate,
  jobController.updateJobStatus
);

router.put(
  '/:jobId/cancel',
  verifyToken,
  jobController.cancelJob
);

module.exports = router;
