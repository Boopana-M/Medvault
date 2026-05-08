const express = require('express');
const router = express.Router();
const {
  uploadRecord,
  getMyRecords,
  getRecordById,
  deleteRecord,
  getTimeline
} = require('../controllers/recordController');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/')); // path to server/uploads
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// All routes require authentication
router.use(protect);

// Patient only routes
router.post('/upload', authorize('patient'), upload.single('file'), uploadRecord);
router.get('/', authorize('patient'), getMyRecords);
router.get('/timeline', authorize('patient'), getTimeline);
router.delete('/:id', authorize('patient'), deleteRecord);

// Accessible by both patient and authorized doctor
router.get('/:id', getRecordById);

module.exports = router;