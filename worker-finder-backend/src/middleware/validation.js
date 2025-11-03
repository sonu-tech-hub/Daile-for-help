const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorList = errors.array().map(err => ({ field: err.path, message: err.msg }));
    const payload = {
      success: false,
      message: 'Validation failed',
      errors: errorList
    };

    // Include helpful debug info in development so clients can see what was received
    if (process.env.NODE_ENV === 'development') {
      payload.debug = {
        body: req.body && Object.keys(req.body).length ? req.body : undefined,
        filesCount: req.files ? (Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length) : 0
      };
    }

    return res.status(400).json(payload);
  }
  
  next();
};

// Registration validation
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('mobile')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit Indian mobile number is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('user_type')
    .isIn(['worker', 'seeker'])
    .withMessage('User type must be either worker or seeker'),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('login')
    .notEmpty()
    .withMessage('Email or mobile is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// OTP validation
const validateOTP = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or mobile number is required'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),
  handleValidationErrors
];

// Worker profile validation
const validateWorkerProfile = [
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name is required (2-255 characters)'),
  body('profession')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Profession is required'),
  body('whatsapp_number')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid WhatsApp number is required'),
  body('experience_years')
    .optional()
    .isFloat({ min: 0, max: 50 })
    .withMessage('Experience must be between 0-50 years'),
  body('hourly_rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address too long'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude required'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude required'),
  handleValidationErrors
];

// Seeker profile validation
const validateSeekerProfile = [
  body('full_name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name is required (2-255 characters)'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address too long'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude required'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude required'),
  handleValidationErrors
];

// Review validation
const validateReview = [
  body('job_id')
    .isInt({ min: 1 })
    .withMessage('Valid job ID is required'),
  body('reviewee_id')
    .isInt({ min: 1 })
    .withMessage('Valid reviewee ID is required'),
  body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('review_text')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review text too long'),
  body('punctuality_rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Punctuality rating must be between 1 and 5'),
  body('quality_rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Quality rating must be between 1 and 5'),
  body('behavior_rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Behavior rating must be between 1 and 5'),
  handleValidationErrors
];

// Search workers validation
const validateWorkerSearch = [
  query('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude required'),
  query('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude required'),
  query('radius')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Radius must be between 1-100 km'),
  query('profession')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Profession too long'),
  query('min_experience')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum experience must be positive'),
  query('max_experience')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum experience must be positive'),
  query('min_rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0-5'),
  handleValidationErrors
];

// Message validation
const validateMessage = [
  body('receiver_id')
    .isInt({ min: 1 })
    .withMessage('Valid receiver ID is required'),
  body('message_text')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message is required (1-2000 characters)'),
  body('job_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid job ID required'),
  handleValidationErrors
];

// Dispute validation
const validateDispute = [
  body('job_id')
    .isInt({ min: 1 })
    .withMessage('Valid job ID is required'),
  body('against_user')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  body('reason')
    .trim()
    // allow slightly shorter reasons (helpful for quick reports) while still blocking empty/too-short inputs
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason is required (5-500 characters)'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description too long'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateOTP,
  validateWorkerProfile,
  validateSeekerProfile,
  validateReview,
  validateWorkerSearch,
  validateMessage,
  validateDispute
};
