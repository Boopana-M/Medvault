import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import UploadRecord from '../components/UploadRecord';
import ShareRecords from '../components/ShareRecords';
import { getMyRecords, getTimeline, deleteRecord } from '../services/recordService';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [loading, setLoading] = useState(true);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    try {
      await deleteRecord(recordToDelete._id);
      setRecords(records.filter(r => r._id !== recordToDelete._id));
      setTimeline(timeline.filter(t => t.id !== recordToDelete._id));
      showToast('Record deleted successfully');
    } catch (error) {
      console.error('Error deleting record:', error);
      showToast('Error deleting record');
    } finally {
      setRecordToDelete(null);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const recordsRes = await getMyRecords();
      setRecords(recordsRes.data);
      const timelineRes = await getTimeline();
      setTimeline(timelineRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      try {
        const recordsRes = await getMyRecords();
        if (isMounted) setRecords(recordsRes.data);
        const timelineRes = await getTimeline();
        if (isMounted) setTimeline(timelineRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    initFetch();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-cyan-600">MedVault</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Welcome, {user?.name}</span>
          {user?.role === 'patient' && (
            <button
              onClick={() => navigate('/emergency-setup')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-bold"
            >
              Emergency QR
            </button>
          )}
          <button
            onClick={logout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 font-medium ${activeTab === 'upload' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-gray-500'}`}
        >
          Upload Record
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 font-medium ${activeTab === 'records' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-gray-500'}`}
        >
          My Records ({records.length})
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 font-medium ${activeTab === 'timeline' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-gray-500'}`}
        >
          Timeline
        </button>
        <button
          onClick={() => setActiveTab('share')}
          className={`px-4 py-2 font-medium ${activeTab === 'share' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-gray-500'}`}
        >
          Share Records
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' && (
        <UploadRecord onUploadSuccess={fetchData} />
      )}

      {activeTab === 'records' && (
        <div className="bg-white rounded-lg shadow">
          {loading && <div className="p-4 text-center">Loading...</div>}
          {!loading && records.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No records yet. Upload your first medical record!
            </div>
          )}
          {!loading && records.map((record) => (
            <div key={record._id} className="border-b p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{record.title}</h3>
                  <p className="text-sm text-gray-500">
                    Type: {record.type} | Date: {new Date(record.dateOfRecord).toLocaleDateString()}
                  </p>
                  {record.metadata?.doctorName && (
                    <p className="text-sm text-gray-600">Doctor: {record.metadata.doctorName}</p>
                  )}
                  {record.description && (
                    <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                  )}
                </div>
                <div className="flex gap-4 items-center">
                  <a
                    href={record.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-600 hover:underline text-sm font-semibold"
                  >
                    View File
                  </a>
                  <button
                    onClick={() => setRecordToDelete(record)}
                    className="text-red-500 hover:text-red-700 text-sm font-semibold flex items-center gap-1"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white rounded-lg shadow p-6">
          {loading && <div className="text-center">Loading timeline...</div>}
          {!loading && timeline.length === 0 && (
            <div className="text-center text-gray-500">No records in timeline</div>
          )}
          {!loading && timeline.map((item) => (
            <div key={item.id} className="border-l-4 border-cyan-500 pl-4 py-3 mb-4">
              <div className="font-semibold">{item.title}</div>
              <div className="text-sm text-gray-500">
                {new Date(item.date).toLocaleDateString()} | {item.type}
              </div>
              {item.doctorName && (
                <div className="text-sm text-gray-600">Doctor: {item.doctorName}</div>
              )}
              {item.hospitalName && (
                <div className="text-sm text-gray-600">Hospital: {item.hospitalName}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'share' && (
        <ShareRecords />
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Record?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{recordToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default Dashboard;