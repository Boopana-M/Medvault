// @desc    Upload a medical record
// @route   POST /api/records/upload
// @access  Private (Patient only)

const Record = require('../models/Record');
const AuditLog = require('../models/AuditLog');

const uploadRecord = async (req, res) => {
  try {
    const { title, type, description, dateOfRecord, doctorName, hospitalName, tags } = req.body;

    let fileUrl = req.body.fileUrl || 'https://via.placeholder.com/150';
    let fileKey = req.body.fileKey || 'placeholder-key';

    if (req.file) {
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      fileKey = req.file.filename;
    }

    const record = await Record.create({
      patientId: req.user._id,
      title,
      type: type || 'other',
      description: description || '',
      fileUrl,
      fileKey,
      fileSize: req.file ? req.file.size : (req.body.fileSize || 0),
      mimeType: req.file ? req.file.mimetype : (req.body.mimeType || 'application/pdf'),
      dateOfRecord: dateOfRecord || Date.now(),
      uploadedBy: req.user._id,
      metadata: {
        doctorName: doctorName || '',
        hospitalName: hospitalName || '',
        tags: tags ? tags.split(',') : []
      }
    });

    await AuditLog.create({
      userId: req.user._id,
      action: 'upload_record',
      resourceId: record._id,
      resourceType: 'record',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Record uploaded successfully',
      data: record
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getMyRecords = async (req, res) => {
  try {
    const records = await Record.find({ patientId: req.user._id, isDeleted: false }).sort({ dateOfRecord: -1 });
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRecordById = async (req, res) => {
  try {
    const record = await Record.findOne({ _id: req.params.id, isDeleted: false });
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    
    if (req.user.role === 'patient' && record.patientId.toString() !== req.user._id.toString()) {
       return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteRecord = async (req, res) => {
  try {
    const record = await Record.findOneAndUpdate(
      { _id: req.params.id, patientId: req.user._id },
      { isDeleted: true },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.status(200).json({ success: true, message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTimeline = async (req, res) => {
  try {
    const records = await Record.find({ patientId: req.user._id, isDeleted: false }).sort({ dateOfRecord: -1 });
    const timeline = records.map(r => ({
      id: r._id,
      title: r.title,
      type: r.type,
      date: r.dateOfRecord,
      doctorName: r.metadata?.doctorName,
      hospitalName: r.metadata?.hospitalName
    }));
    res.status(200).json({ success: true, data: timeline });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  uploadRecord,
  getMyRecords,
  getRecordById,
  deleteRecord,
  getTimeline
};
