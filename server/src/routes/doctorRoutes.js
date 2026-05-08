const express = require('express');
const router = express.Router();
const {
  getSharedRecords,
  getExpiringLinks,
  getRecentPatients,
  getPatientTimeline,
  addClinicalNote,
  getClinicalNotes,
  requestMoreRecords
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('doctor'));

router.get('/shared-records', getSharedRecords);
router.get('/expiring-links', getExpiringLinks);
router.get('/recent-patients', getRecentPatients);
router.get('/patient/:patientId/timeline', getPatientTimeline);

router.post('/notes', addClinicalNote);
router.get('/notes/:patientId', getClinicalNotes);
router.get('/notes/:patientId/:recordId', getClinicalNotes);

router.post('/request-records', requestMoreRecords);

module.exports = router;