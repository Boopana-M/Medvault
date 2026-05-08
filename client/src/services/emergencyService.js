import api from './api';

export const getEmergencyProfile = () => {
  return api.get('/emergency/profile');
};

export const updateEmergencyProfile = (profileData) => {
  return api.put('/emergency/profile', profileData);
};

export const getQRCode = () => {
  return api.get('/emergency/qr-code');
};

export const getPublicEmergencyInfo = (token) => {
  return api.get(`/emergency/access/${token}`);
};