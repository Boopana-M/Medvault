import api from './api';

export const getSharedRecords = (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  return api.get(`/doctor/shared-records?${query}`);
};

export const getExpiringLinks = () => {
  return api.get('/doctor/expiring-links');
};

export const getRecentPatients = () => {
  return api.get('/doctor/recent-patients');
};

export const getPatientTimeline = (patientId) => {
  return api.get(`/doctor/patient/${patientId}/timeline`);
};

export const addClinicalNote = (data) => {
  return api.post('/doctor/notes', data);
};

export const getClinicalNotes = (patientId, recordId = '') => {
  return api.get(`/doctor/notes/${patientId}${recordId ? `/${recordId}` : ''}`);
};

export const requestMoreRecords = (data) => {
  return api.post('/doctor/request-records', data);
};