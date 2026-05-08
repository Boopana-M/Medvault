import api from './api';

export const generateShareLink = async (doctorEmail, recordIds, expiryHours) => {
  const response = await api.post('/share/generate', { doctorEmail, recordIds, expiryHours });
  return response.data;
};

export const getMyTokens = async () => {
  const response = await api.get('/share/my-tokens');
  return response.data;
};

export const revokeToken = async (tokenId) => {
  const response = await api.delete(`/share/revoke/${tokenId}`);
  return response.data;
};

export const getAccessLogs = async () => {
  const response = await api.get('/share/logs');
  return response.data;
};