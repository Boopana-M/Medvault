const mongoose = require('mongoose');

const clinicalNoteSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Record'
  },
  noteText: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ClinicalNote', clinicalNoteSchema);