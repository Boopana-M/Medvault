import { useState, useEffect } from 'react';
import { generateShareLink, getMyTokens, revokeToken } from '../services/shareService';
import { getMyRecords } from '../services/recordService';

const ShareRecords = () => {
  const [records, setRecords] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareForm, setShareForm] = useState({
    doctorEmail: '',
    expiryHours: 24
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchData = async () => {
    try {
      const [recordsRes, tokensRes] = await Promise.all([
        getMyRecords(),
        getMyTokens()
      ]);
      setRecords(recordsRes.data);
      setTokens(tokensRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordSelect = (recordId) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map(r => r._id));
    }
  };

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    
    if (!shareForm.doctorEmail) {
      showToast('Please enter doctor email');
      return;
    }

    if (selectedRecords.length === 0) {
      showToast('Please select at least one record to share');
      return;
    }

    try {
      const response = await generateShareLink(
        shareForm.doctorEmail,
        selectedRecords,
        shareForm.expiryHours
      );
      
      const shareLink = `${window.location.origin}/shared/${response.data.token}`;
      setGeneratedLink(shareLink);
      showToast('Share link generated successfully!');
      
      // Reset form
      setShareForm({ doctorEmail: '', expiryHours: 24 });
      setSelectedRecords([]);
      
      // Refresh tokens
      fetchData();
    } catch (error) {
      console.error('Error generating link:', error);
      showToast(error.response?.data?.message || 'Error generating share link');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    showToast('Link copied to clipboard!');
  };

  const handleRevokeToken = async (tokenId) => {
    try {
      await revokeToken(tokenId);
      showToast('Access revoked successfully');
      fetchData();
    } catch (error) {
      console.error('Error revoking token:', error);
      showToast('Error revoking access');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getExpiryStatus = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const hoursLeft = Math.floor((expiry - now) / (1000 * 60 * 60));
    
    if (hoursLeft <= 0) return { text: 'Expired', color: 'text-red-600' };
    if (hoursLeft <= 24) return { text: `${hoursLeft}h left`, color: 'text-orange-600' };
    const daysLeft = Math.floor(hoursLeft / 24);
    return { text: `${daysLeft}d left`, color: 'text-green-600' };
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Share Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-cyan-600 mb-4">Share Records with Doctor</h2>
        
        <form onSubmit={handleGenerateLink} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Doctor Email
            </label>
            <input
              type="email"
              value={shareForm.doctorEmail}
              onChange={(e) => setShareForm(prev => ({ ...prev, doctorEmail: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="doctor@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Duration
            </label>
            <select
              value={shareForm.expiryHours}
              onChange={(e) => setShareForm(prev => ({ ...prev, expiryHours: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
              <option value={168}>7 days</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Records to Share ({selectedRecords.length} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-cyan-600 hover:text-cyan-700"
              >
                {selectedRecords.length === records.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-2">
              {records.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No records available to share</p>
              ) : (
                records.map((record) => (
                  <label
                    key={record._id}
                    className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record._id)}
                      onChange={() => handleRecordSelect(record._id)}
                      className="mr-3 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{record.title}</div>
                      <div className="text-sm text-gray-500">
                        {record.type} • {new Date(record.dateOfRecord).toLocaleDateString()}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-cyan-600 text-white py-2 px-4 rounded-md hover:bg-cyan-700 font-medium"
          >
            Generate Share Link
          </button>
        </form>
      </div>

      {/* Generated Link */}
      {generatedLink && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">Share Link Generated!</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={generatedLink}
              readOnly
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
            />
            <button
              onClick={handleCopyLink}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}

      {/* Active Shares */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-cyan-600 mb-4">Active Shares</h2>
        
        {tokens.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No active shares</p>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => {
              const status = getExpiryStatus(token.expiresAt);
              return (
                <div key={token._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">
                        Shared with: {token.doctorEmail}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Records: {token.recordIds?.length || 'All'} • 
                        Created: {formatDate(token.createdAt)} • 
                        <span className={`ml-2 ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      {token.accessCount > 0 && (
                        <div className="text-sm text-gray-500">
                          Accessed {token.accessCount} times
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRevokeToken(token._id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
};

export default ShareRecords;
