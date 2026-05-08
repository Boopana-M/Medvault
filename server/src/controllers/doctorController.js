const AccessToken = require('../models/AccessToken');
const Record = require('../models/Record');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ClinicalNote = require('../models/ClinicalNote');
const Notification = require('../models/Notification');
const DoctorViewLog = require('../models/DoctorViewLog');

// @desc    Get all records shared with the doctor
// @route   GET /api/doctor/shared-records
// @access  Private (Doctor only)
const getSharedRecords = async (req, res) => {
  try {
    const { timeFilter, patientName, dateFrom, dateTo } = req.query;
    
    // Find active access tokens for this doctor
    const tokens = await AccessToken.find({
      doctorId: req.user._id,
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).populate('patientId', 'name email');

    let allSharedRecords = [];

    // Collect records
    for (const token of tokens) {
      if (token.recordIds && token.recordIds.length > 0) {
        // Specific records shared
        let query = { _id: { $in: token.recordIds }, isDeleted: false };
        if (dateFrom && dateTo) {
          query.dateOfRecord = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
        }
        
        const records = await Record.find(query).sort({ dateOfRecord: -1 }).lean();
        
        records.forEach(record => {
           allSharedRecords.push({
             ...record,
             patient: token.patientId,
             token: token.token
           });
        });
      } else {
        // All records shared
        let query = { patientId: token.patientId._id, isDeleted: false };
        if (dateFrom && dateTo) {
          query.dateOfRecord = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
        }
        const records = await Record.find(query).sort({ dateOfRecord: -1 }).lean();
        
        records.forEach(record => {
           allSharedRecords.push({
             ...record,
             patient: token.patientId,
             token: token.token
           });
        });
      }
    }

    // Filter by patient name if provided
    if (patientName) {
      allSharedRecords = allSharedRecords.filter(r => r.patient.name.toLowerCase().includes(patientName.toLowerCase()));
    }

    // Filter by timeFilter (Today, This Week, This Month - based on record date or shared date? Assuming record date based on spec)
    if (timeFilter) {
      const now = new Date();
      if (timeFilter === 'Today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        allSharedRecords = allSharedRecords.filter(r => new Date(r.dateOfRecord) >= startOfDay);
      } else if (timeFilter === 'This Week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        allSharedRecords = allSharedRecords.filter(r => new Date(r.dateOfRecord) >= startOfWeek);
      } else if (timeFilter === 'This Month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        allSharedRecords = allSharedRecords.filter(r => new Date(r.dateOfRecord) >= startOfMonth);
      }
    }

    // Sort all records chronologically (newest first)
    allSharedRecords.sort((a, b) => new Date(b.dateOfRecord) - new Date(a.dateOfRecord));
    
    // Deduplicate (in case tokens overlap)
    const uniqueRecordsMap = new Map();
    allSharedRecords.forEach(r => {
      if (!uniqueRecordsMap.has(r._id.toString())) {
        uniqueRecordsMap.set(r._id.toString(), r);
      }
    });

    // Group deduplicated records by patient
    const groupedByPatient = new Map();
    Array.from(uniqueRecordsMap.values()).forEach(record => {
      const pId = record.patient._id.toString();
      if (!groupedByPatient.has(pId)) {
        groupedByPatient.set(pId, {
          patient: record.patient,
          records: []
        });
      }
      groupedByPatient.get(pId).records.push(record);
    });

    res.status(200).json({ success: true, data: Array.from(groupedByPatient.values()) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get expiring links
// @route   GET /api/doctor/expiring-links
// @access  Private (Doctor only)
const getExpiringLinks = async (req, res) => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringTokens = await AccessToken.find({
      doctorId: req.user._id,
      status: 'active',
      expiresAt: { $gt: now, $lte: threeDaysFromNow }
    }).populate('patientId', 'name email').sort({ expiresAt: 1 });

    const enrichedTokens = expiringTokens.map(token => {
      const remainingMs = token.expiresAt - now;
      const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const remainingDays = Math.floor(remainingHours / 24);
      
      let warningLevel = 'yellow';
      if (remainingHours <= 24) {
        warningLevel = 'red';
      }

      return {
        ...token.toObject(),
        remainingHours,
        remainingDays,
        warningLevel
      };
    });

    res.status(200).json({ success: true, data: enrichedTokens });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get recently accessed patients
// @route   GET /api/doctor/recent-patients
// @access  Private (Doctor only)
const getRecentPatients = async (req, res) => {
  try {
    // Find recent views from DoctorViewLog
    const logs = await DoctorViewLog.find({ doctorId: req.user._id })
      .populate('patientId', 'name email')
      .sort({ lastViewedAt: -1 })
      .limit(5);

    const recentPatients = logs.map(log => ({
      patientId: log.patientId._id,
      name: log.patientId.name,
      email: log.patientId.email,
      lastAccess: log.lastViewedAt,
      viewCount: log.viewCount
    }));

    res.status(200).json({ success: true, data: recentPatients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get complete timeline of a patient (only records shared with this doctor)
// @route   GET /api/doctor/patient/:patientId/timeline
// @access  Private (Doctor only)
const getPatientTimeline = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Verify doctor has access
    const tokens = await AccessToken.find({
      doctorId: req.user._id,
      patientId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
    
    if (!tokens || tokens.length === 0) {
      return res.status(403).json({ success: false, message: 'You do not have access to this patient\'s records' });
    }
    
    let allowedRecordIds = new Set();
    let hasFullAccess = false;
    
    tokens.forEach(token => {
      if (!token.recordIds || token.recordIds.length === 0) {
        hasFullAccess = true;
      } else {
        token.recordIds.forEach(id => allowedRecordIds.add(id.toString()));
      }
    });
    
    let query = { patientId, isDeleted: false };
    if (!hasFullAccess) {
      query._id = { $in: Array.from(allowedRecordIds) };
    }
    
    const records = await Record.find(query).sort({ dateOfRecord: -1 });

    // Track doctor view
    await DoctorViewLog.findOneAndUpdate(
      { doctorId: req.user._id, patientId },
      { 
        $set: { lastViewedAt: new Date() },
        $inc: { viewCount: 1 }
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add clinical note
// @route   POST /api/doctor/notes
// @access  Private (Doctor only)
const addClinicalNote = async (req, res) => {
  try {
    const { patientId, recordId, noteText } = req.body;
    
    const note = await ClinicalNote.create({
      doctorId: req.user._id,
      patientId,
      recordId: recordId || null,
      noteText
    });
    
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get clinical notes
// @route   GET /api/doctor/notes/:patientId/:recordId?
// @access  Private (Doctor only)
const getClinicalNotes = async (req, res) => {
  try {
    const { patientId, recordId } = req.params;
    
    let query = { doctorId: req.user._id, patientId };
    if (recordId) {
      query.recordId = recordId;
    }
    
    const notes = await ClinicalNote.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Request more records
// @route   POST /api/doctor/request-records
// @access  Private (Doctor only)
const requestMoreRecords = async (req, res) => {
  try {
    const { patientId, message, recordTypesNeeded } = req.body;
    
    const notification = await Notification.create({
      userId: patientId,
      senderId: req.user._id,
      type: 'record_request',
      message,
      recordTypesNeeded: recordTypesNeeded || []
    });
    
    res.status(201).json({ success: true, message: 'Request sent to patient successfully', data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSharedRecords,
  getExpiringLinks,
  getRecentPatients,
  getPatientTimeline,
  addClinicalNote,
  getClinicalNotes,
  requestMoreRecords
};