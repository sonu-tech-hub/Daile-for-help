const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const {
  validateRegistration,
  validateLogin,
  validateOTP
} = require('../middleware/validation');

// Public routes
router.post('/register', validateRegistration, authController.register);
router.post('/verify-otp', validateOTP, authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/login', validateLogin, authController.login);

// Protected routes
router.get('/me', verifyToken, authController.getCurrentUser);
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;
