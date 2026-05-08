const mongoose = require('mongoose');

const accessTokenSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recordIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Record'
  }],
  token: {
    type: String,
    required: true,
    unique: true
  },
  accessType: {
    type: String,
    enum: ['temporary', 'permanent', 'single_use'],
    default: 'temporary'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  accessCount: {
    type: Number,
    default: 0
  },
  maxAccessCount: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
accessTokenSchema.index({ token: 1 });
accessTokenSchema.index({ expiresAt: 1 });
accessTokenSchema.index({ patientId: 1, status: 1 });

module.exports = mongoose.model('AccessToken', accessTokenSchema);