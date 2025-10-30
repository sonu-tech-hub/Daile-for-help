const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { verifyToken } = require('../middleware/auth');

// Protected routes
router.get('/info', verifyToken, referralController.getReferralInfo);
router.get('/list', verifyToken, referralController.getAllReferrals);

// Public route
router.get('/validate/:referral_code', referralController.validateReferralCode);

module.exports = router;
