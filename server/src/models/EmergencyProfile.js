const mongoose = require('mongoose');

const emergencyProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', ''],
    default: ''
  },
  allergies: {
    type: [String],
    default: []
  },
  chronicConditions: {
    type: [String],
    default: []
  },
  currentMedications: {
    type: [String],
    default: []
  },
  emergencyContactName: {
    type: String,
    default: ''
  },
  emergencyContactPhone: {
    type: String,
    default: ''
  },
  organDonor: {
    type: Boolean,
    default: false
  },
  knownSurgeries: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmergencyProfile', emergencyProfileSchema);