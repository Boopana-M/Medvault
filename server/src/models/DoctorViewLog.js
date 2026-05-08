const mongoose = require('mongoose');

const doctorViewLogSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastViewedAt: { type: Date, default: Date.now },
  viewCount: { type: Number, default: 1 }
});

module.exports = mongoose.model('DoctorViewLog', doctorViewLogSchema);
