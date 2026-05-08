import api from './api';

export const uploadRecord = async (formData) => {
  const response = await api.post('/records/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getMyRecords = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const response = await api.get(`/records${params ? `?${params}` : ''}`);
  return response.data;
};

export const getTimeline = async () => {
  const response = await api.get('/records/timeline');
  return response.data;
};

export const deleteRecord = async (recordId) => {
  const response = await api.delete(`/records/${recordId}`);
  return response.data;
};