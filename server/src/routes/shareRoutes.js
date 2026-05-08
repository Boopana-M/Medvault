const express = require('express');
const router = express.Router();
const {
  generateAccessToken,
  accessSharedRecords,
  getMyTokens,
  revokeToken,
  getAccessLogs
} = require('../controllers/shareController');
const { protect, authorize } = require('../middleware/auth');

// Public route (requires token in URL)
router.get('/access/:token', accessSharedRecords);

// Patient only routes
router.post('/generate', protect, authorize('patient'), generateAccessToken);
router.get('/my-tokens', protect, authorize('patient'), getMyTokens);
router.delete('/revoke/:tokenId', protect, authorize('patient'), revokeToken);
router.get('/logs', protect, authorize('patient'), getAccessLogs);

module.exports = router;