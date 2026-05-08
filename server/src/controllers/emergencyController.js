const crypto = require('crypto');
const qrcode = require('qrcode');
const EmergencyProfile = require('../models/EmergencyProfile');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Get authenticated user's emergency profile
// @route   GET /api/emergency/profile
// @access  Private (Patient only)
const getEmergencyProfile = async (req, res) => {
  try {
    let profile = await EmergencyProfile.findOne({ userId: req.user._id });
    
    // If no profile exists, return a default empty object
    if (!profile) {
      return res.status(200).json({ success: true, data: null });
    }
    
    // Also return the emergency token
    const user = await User.findById(req.user._id);
    
    res.status(200).json({ 
      success: true, 
      data: profile,
      token: user.emergencyToken
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create or update emergency profile
// @route   PUT /api/emergency/profile
// @access  Private (Patient only)
const updateEmergencyProfile = async (req, res) => {
  try {
    const { 
      bloodType, allergies, chronicConditions, currentMedications, 
      emergencyContactName, emergencyContactPhone, organDonor, knownSurgeries 
    } = req.body;
    
    // Generate an emergency token if the user doesn't have one
    const user = await User.findById(req.user._id);
    let token = user.emergencyToken;
    
    if (!token) {
      token = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 character alphanumeric
      user.emergencyToken = token;
      await user.save();
    }
    
    let profile = await EmergencyProfile.findOne({ userId: req.user._id });
    
    if (profile) {
      // Update existing
      profile.bloodType = bloodType;
      profile.allergies = Array.isArray(allergies) ? allergies : profile.allergies;
      profile.chronicConditions = Array.isArray(chronicConditions) ? chronicConditions : profile.chronicConditions;
      profile.currentMedications = Array.isArray(currentMedications) ? currentMedications : profile.currentMedications;
      profile.emergencyContactName = emergencyContactName || profile.emergencyContactName;
      profile.emergencyContactPhone = emergencyContactPhone || profile.emergencyContactPhone;
      profile.organDonor = organDonor !== undefined ? organDonor : profile.organDonor;
      profile.knownSurgeries = Array.isArray(knownSurgeries) ? knownSurgeries : profile.knownSurgeries;
      
      await profile.save();
    } else {
      // Create new
      profile = await EmergencyProfile.create({
        userId: req.user._id,
        bloodType,
        allergies: Array.isArray(allergies) ? allergies : [],
        chronicConditions: Array.isArray(chronicConditions) ? chronicConditions : [],
        currentMedications: Array.isArray(currentMedications) ? currentMedications : [],
        emergencyContactName: emergencyContactName || '',
        emergencyContactPhone: emergencyContactPhone || '',
        organDonor: organDonor || false,
        knownSurgeries: Array.isArray(knownSurgeries) ? knownSurgeries : []
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Emergency profile updated successfully',
      data: profile,
      token
    });
  } catch (error) {
    console.error('Emergency profile update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate QR code image for emergency profile
// @route   GET /api/emergency/qr-code
// @access  Private (Patient only)
const generateQRCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.emergencyToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'No emergency token found. Please create an emergency profile first.' 
      });
    }
    
    // Instead of hardcoding localhost, we use the host making the request 
    // so it dynamically matches localhost or your local IP address (e.g. 192.168.x.x)
    const host = req.hostname;
    const frontendUrl = process.env.FRONTEND_URL || `http://${host}:5174`;
    const emergencyUrl = `${frontendUrl}/emergency/${user.emergencyToken}`;
    
    // Generate QR code as data URI
    const qrCodeDataUrl = await qrcode.toDataURL(emergencyUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    res.status(200).json({ 
      success: true, 
      qrCodeDataUrl,
      url: emergencyUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Public endpoint to view emergency info
// @route   GET /api/emergency/access/:token
// @access  Public
const getPublicEmergencyInfo = async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({ emergencyToken: token });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Invalid emergency token' });
    }
    
    const profile = await EmergencyProfile.findOne({ userId: user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Emergency profile not configured' });
    }
    
    // Log emergency access
    await AuditLog.create({
      userId: user._id, // The user whose profile was accessed
      action: 'emergency_access',
      resourceId: profile._id,
      resourceType: 'emergency_profile',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: 'Emergency profile accessed via public token'
    });
    
    // Only send critical information
    const publicProfile = {
      name: user.name, // Send the user's name
      bloodType: profile.bloodType,
      allergies: profile.allergies,
      chronicConditions: profile.chronicConditions,
      currentMedications: profile.currentMedications,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
      organDonor: profile.organDonor,
      knownSurgeries: profile.knownSurgeries,
      updatedAt: profile.updatedAt
    };
    
    res.status(200).json({ success: true, data: publicProfile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEmergencyProfile,
  updateEmergencyProfile,
  generateQRCode,
  getPublicEmergencyInfo
};