const crypto = require('crypto');
const User = require('../models/User');
const Record = require('../models/Record');
const AccessToken = require('../models/AccessToken');
const AuditLog = require('../models/AuditLog');

// Helper function to generate unique token
const generateUniqueToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// @desc    Generate temporary access token for doctor
// @route   POST /api/share/generate
// @access  Private (Patient only)
const generateAccessToken = async (req, res) => {
  try {
    const { doctorEmail, recordIds, expiryHours, accessType, maxAccessCount } = req.body;

    // Validate doctor exists
    const doctor = await User.findOne({ email: doctorEmail, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found with this email. Please ask doctor to register first.'
      });
    }

    // Validate records belong to patient
    if (recordIds && recordIds.length > 0) {
      const records = await Record.find({
        _id: { $in: recordIds },
        patientId: req.user._id,
        isDeleted: false
      });
      
      if (records.length !== recordIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more records not found or do not belong to you'
        });
      }
    }

    // Calculate expiry date
    const expiryHoursNum = parseInt(expiryHours) || 24; // Default 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHoursNum);

    // Generate token
    const token = generateUniqueToken();

    const accessToken = await AccessToken.create({
      patientId: req.user._id,
      doctorId: doctor._id,
      recordIds: recordIds || [],
      token,
      accessType: accessType || 'temporary',
      expiresAt,
      maxAccessCount: maxAccessCount || null,
      status: 'active'
    });

    // Log the action
    await AuditLog.create({
      userId: req.user._id,
      action: 'share_record',
      resourceId: accessToken._id,
      resourceType: 'token',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Generate shareable link
    const shareLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${token}`;

    res.status(201).json({
      success: true,
      message: 'Access token generated successfully',
      data: {
        tokenId: accessToken._id,
        token: accessToken.token,
        shareLink,
        expiresAt,
        doctor: {
          id: doctor._id,
          name: doctor.name,
          email: doctor.email
        },
        recordCount: recordIds ? recordIds.length : 'All records'
      }
    });
  } catch (error) {
    console.error('Generate token error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Access shared records using token (Doctor view)
// @route   GET /api/share/access/:token
// @access  Public (requires token)
const accessSharedRecords = async (req, res) => {
  try {
    const { token } = req.params;

    // Find and validate token
    const accessToken = await AccessToken.findOne({ token })
      .populate('patientId', 'name email')
      .populate('recordIds');

    if (!accessToken) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired access link'
      });
    }

    // Check if token is active
    if (accessToken.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Access has been ${accessToken.status}. Please contact the patient.`
      });
    }

    // Check expiry
    if (new Date() > accessToken.expiresAt) {
      accessToken.status = 'expired';
      await accessToken.save();
      return res.status(403).json({
        success: false,
        message: 'This access link has expired.'
      });
    }

    // Check max access count
    if (accessToken.maxAccessCount && accessToken.accessCount >= accessToken.maxAccessCount) {
      accessToken.status = 'expired';
      await accessToken.save();
      return res.status(403).json({
        success: false,
        message: 'This access link has reached its maximum usage limit.'
      });
    }

    // Increment access count
    accessToken.accessCount += 1;
    await accessToken.save();

    // Get records to share
    let records = [];
    if (accessToken.recordIds.length === 0) {
      // Share all records
      records = await Record.find({
        patientId: accessToken.patientId._id,
        isDeleted: false
      }).select('-fileKey');
    } else {
      records = accessToken.recordIds;
    }

    res.status(200).json({
      success: true,
      message: 'Access granted',
      data: {
        patientName: accessToken.patientId.name,
        patientEmail: accessToken.patientId.email,
        accessToken: {
          expiresAt: accessToken.expiresAt,
          remainingAccess: accessToken.maxAccessCount ? 
            accessToken.maxAccessCount - accessToken.accessCount : 'Unlimited'
        },
        records
      }
    });
  } catch (error) {
    console.error('Access error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all active tokens for patient
// @route   GET /api/share/my-tokens
// @access  Private (Patient only)
const getMyTokens = async (req, res) => {
  try {
    const tokens = await AccessToken.find({ 
      patientId: req.user._id,
      status: { $in: ['active', 'revoked'] }
    })
    .populate('doctorId', 'name email doctorDetails')
    .sort({ createdAt: -1 });

    const formattedTokens = tokens.map(token => ({
      _id: token._id,
      doctorName: token.doctorId.name,
      doctorEmail: token.doctorId.email,
      doctorSpecialization: token.doctorId.doctorDetails?.specialization,
      recordCount: token.recordIds.length === 0 ? 'All records' : token.recordIds.length,
      expiresAt: token.expiresAt,
      accessCount: token.accessCount,
      maxAccessCount: token.maxAccessCount,
      status: token.status,
      createdAt: token.createdAt
    }));

    res.status(200).json({
      success: true,
      count: formattedTokens.length,
      data: formattedTokens
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Revoke access token
// @route   DELETE /api/share/revoke/:tokenId
// @access  Private (Patient only)
const revokeToken = async (req, res) => {
  try {
    const token = await AccessToken.findOne({
      _id: req.params.tokenId,
      patientId: req.user._id
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }

    token.status = 'revoked';
    await token.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'revoke_access',
      resourceId: token._id,
      resourceType: 'token',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Access token revoked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get access logs for patient
// @route   GET /api/share/logs
// @access  Private (Patient only)
const getAccessLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({
      userId: req.user._id,
      action: { $in: ['share_record', 'revoke_access'] }
    })
    .sort({ timestamp: -1 })
    .limit(50);

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { 
  generateAccessToken, 
  accessSharedRecords, 
  getMyTokens, 
  revokeToken,
  getAccessLogs
};