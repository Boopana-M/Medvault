const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  getEmergencyProfile,
  updateEmergencyProfile,
  generateQRCode,
  getPublicEmergencyInfo
} = require('../controllers/emergencyController');
const { protect, authorize } = require('../middleware/auth');

// Rate limiting for public emergency access (10 requests per minute)
const emergencyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 10,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});

// Public route to view emergency info (rate limited)
router.get('/access/:token', emergencyLimiter, getPublicEmergencyInfo);

// Protected routes (patient only)
router.use(protect);
router.use(authorize('patient'));

router.get('/profile', getEmergencyProfile);
router.put('/profile', updateEmergencyProfile);
router.get('/qr-code', generateQRCode);

module.exports = router;