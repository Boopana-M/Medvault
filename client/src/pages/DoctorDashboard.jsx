import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getSharedRecords, getExpiringLinks, getRecentPatients, 
  getPatientTimeline, addClinicalNote, getClinicalNotes, requestMoreRecords 
} from '../services/doctorService';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState('vault'); // vault, links, recent
  const [records, setRecords] = useState([]);
  const [expiringLinks, setExpiringLinks] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ timeFilter: '', patientName: '', dateFrom: '', dateTo: '' });
  
  // For Patient Timeline View Modal
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [patientTimeline, setPatientTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  
  // For Record details/notes
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  // Request records
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestData, setRequestData] = useState({ message: '', recordTypes: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'vault') {
        const res = await getSharedRecords(filters);
        setRecords(res.data.data);
      } else if (activeTab === 'links') {
        const res = await getExpiringLinks();
        setExpiringLinks(res.data.data);
      } else if (activeTab === 'recent') {
        const res = await getRecentPatients();
        setRecentPatients(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
        setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const openPatientTimeline = async (patientId, patientName) => {
    setSelectedPatientId(patientId);
    setSelectedPatientName(patientName);
    setTimelineLoading(true);
    try {
      const res = await getPatientTimeline(patientId);
      setPatientTimeline(res.data.data);
      
      // Load general patient notes
      const notesRes = await getClinicalNotes(patientId);
      setClinicalNotes(notesRes.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleSaveNote = async (recordId = null) => {
    if (!newNote.trim()) return;
    setNoteLoading(true);
    try {
      await addClinicalNote({ patientId: selectedPatientId, recordId, noteText: newNote });
      setNewNote('');
      // refresh notes
      const notesRes = await getClinicalNotes(selectedPatientId, recordId || '');
      setClinicalNotes(notesRes.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setNoteLoading(false);
    }
  };

  const handleSendRequest = async () => {
    try {
      const types = requestData.recordTypes.split(',').map(s => s.trim()).filter(Boolean);
      await requestMoreRecords({
        patientId: selectedPatientId,
        message: requestData.message,
        recordTypesNeeded: types
      });
      alert('Request sent!');
      setShowRequestModal(false);
      setRequestData({ message: '', recordTypes: '' });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold border-l-4 border-blue-600 pl-4 text-gray-800">Doctor's Terminal</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 font-medium">Dr. {user?.name}</span>
          <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-semibold shadow">Logout</button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-white p-2 rounded-lg shadow-sm border">
        <button
          onClick={() => setActiveTab('vault')}
          className={`px-6 py-2 font-bold rounded-md ${activeTab === 'vault' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Report Vault
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`px-6 py-2 font-bold rounded-md ${activeTab === 'links' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Expiring Links
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`px-6 py-2 font-bold rounded-md ${activeTab === 'recent' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Recent Patients
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 min-h-[500px]">
        {/* REPORT VAULT */}
        {activeTab === 'vault' && (
          <div>
            <div className="flex flex-col md:flex-row gap-4 mb-6 pb-4 border-b flex-wrap">
              <input
                type="text"
                name="patientName"
                placeholder="Search patient name..."
                value={filters.patientName}
                onChange={handleFilterChange}
                className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64"
              />
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm font-semibold">From:</span>
                <input
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm font-semibold">To:</span>
                <input
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                  className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <select
                name="timeFilter"
                value={filters.timeFilter}
                onChange={handleFilterChange}
                className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-48"
              >
                <option value="">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
            </div>

            {loading ? <div className="text-center py-10 text-gray-500">Loading vault...</div> : (
              <div className="grid gap-4">
                {records.length === 0 ? <p className="text-gray-500 text-center py-10">No records found matching your filters.</p> : null}
                {records.map(record => (
                  <div key={record._id} className="flex justify-between items-center p-4 border rounded-lg hover:shadow-md transition bg-gray-50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-gray-800">{record.patient?.name}</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{record.type}</span>
                      </div>
                      <p className="font-semibold text-gray-700">{record.title}</p>
                      <p className="text-sm text-gray-500">{new Date(record.dateOfRecord).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => openPatientTimeline(record.patient?._id, record.patient?.name)}
                         className="text-blue-600 hover:text-blue-800 font-semibold underline text-sm"
                       >
                         View Timeline
                       </button>
                       <a href={record.fileUrl} target="_blank" rel="noopener noreferrer" className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900 font-semibold">
                         View Record
                       </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EXPIRING LINKS */}
        {activeTab === 'links' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Access Links Expiring in Next 3 Days</h2>
            {loading ? <div className="text-center py-10 text-gray-500">Loading links...</div> : (
              <div className="grid gap-4">
                {expiringLinks.length === 0 ? <p className="text-gray-500">No links expiring soon.</p> : null}
                {expiringLinks.map(link => {
                   const hoursLeft = Math.floor((new Date(link.expiresAt) - new Date()) / (1000 * 60 * 60));
                   const daysLeft = Math.floor(hoursLeft / 24);
                   const isUrgent = daysLeft < 1;
                   return (
                     <div key={link._id} className={`p-4 border rounded-lg flex justify-between items-center ${isUrgent ? 'border-red-400 bg-red-50' : 'border-yellow-400 bg-yellow-50'}`}>
                        <div>
                          <p className="font-bold text-lg">{link.patientId?.name || 'Unknown Patient'}</p>
                          <p className="text-sm text-gray-700">Expires: {new Date(link.expiresAt).toLocaleString()}</p>
                          <p className={`text-sm font-bold mt-1 ${isUrgent ? 'text-red-600' : 'text-yellow-600'}`}>
                            {daysLeft > 0 ? `${daysLeft} days remaining` : `${hoursLeft} hours remaining`}
                          </p>
                        </div>
                        <button 
                           onClick={() => { setSelectedPatientId(link.patientId?._id); setShowRequestModal(true); }}
                           className="bg-white border-2 border-gray-800 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-100"
                        >
                          Request Extension
                        </button>
                     </div>
                   );
                })}
              </div>
            )}
          </div>
        )}

        {/* RECENT PATIENTS */}
        {activeTab === 'recent' && (
          <div>
             <h2 className="text-xl font-bold mb-4">Recently Accessed Patients</h2>
             {loading ? <div className="text-center py-10 text-gray-500">Loading patients...</div> : (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {recentPatients.length === 0 ? <p className="text-gray-500 col-span-full">No recent patients tracked.</p> : null}
                  {recentPatients.map(patient => (
                    <div key={patient.patientId} className="border p-4 rounded-xl shadow-sm hover:shadow active:scale-95 transition cursor-pointer bg-white" onClick={() => openPatientTimeline(patient.patientId, patient.name)}>
                       <div className="text-4xl text-blue-500 mb-2">👤</div>
                       <h3 className="font-bold text-lg">{patient.name}</h3>
                       <p className="text-xs text-gray-500">Last access: {new Date(patient.lastAccess).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
             )}
          </div>
        )}
      </div>

      {/* Patient Timeline / Details Modal */}
      {selectedPatientId && (
         <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
               <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedPatientName}'s Medical Timeline</h2>
                    <p className="text-sm text-gray-500">Chronological view of shared records</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowRequestModal(true)} 
                      className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded"
                    >
                      + Request Records
                    </button>
                    <button onClick={() => setSelectedPatientId(null)} className="text-gray-500 hover:text-gray-800 font-bold text-xl px-4">✕</button>
                  </div>
               </div>

               <div className="flex-1 overflow-auto flex flex-col md:flex-row">
                  {/* Timeline */}
                  <div className="flex-1 border-r p-6 overflow-y-auto">
                     {timelineLoading ? <div className="text-center mt-10">Loading timeline...</div> : (
                        <div className="space-y-6">
                           {patientTimeline.length === 0 && <p className="text-gray-500">No records found.</p>}
                           {patientTimeline.map(record => (
                              <div key={record._id} className="relative pl-6 border-l-2 border-blue-200 group">
                                 <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[9px] top-1 group-hover:bg-blue-700 transition"></div>
                                 <div 
                                    className="bg-gray-50 p-3 rounded-lg border cursor-pointer hover:border-blue-300"
                                    onClick={() => setSelectedRecord(record)}
                                 >
                                    <div className="flex justify-between items-start mb-1">
                                      <h4 className="font-bold text-gray-800">{record.title}</h4>
                                      <span className="text-xs font-semibold bg-gray-200 px-2 py-0.5 rounded">{record.type}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">{new Date(record.dateOfRecord).toLocaleDateString()}</p>
                                    <div className="flex gap-2">
                                       <a href={record.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-semibold" onClick={e => e.stopPropagation()}>Open File</a>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>

                  {/* Notes Panel */}
                  <div className="w-full md:w-96 bg-blue-50/30 p-6 flex flex-col">
                     <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">
                       {selectedRecord ? `Notes on: ${selectedRecord.title}` : `General Notes for ${selectedPatientName}`}
                     </h3>

                     <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2">
                       {clinicalNotes.filter(n => selectedRecord ? n.recordId === selectedRecord._id : true).map(note => (
                         <div key={note._id} className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg shadow-sm">
                           <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.noteText}</p>
                           <p className="text-[10px] text-gray-500 mt-2 text-right">{new Date(note.createdAt).toLocaleString()}</p>
                         </div>
                       ))}
                       {clinicalNotes.filter(n => selectedRecord ? n.recordId === selectedRecord._id : true).length === 0 && (
                         <p className="text-gray-400 text-sm text-center mt-10">No notes found.</p>
                       )}
                     </div>

                     <div className="mt-auto">
                        <textarea 
                           className="w-full p-3 border rounded-lg resize-none text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                           rows="3"
                           placeholder="Type a clinical note here. Patients cannot see this."
                           value={newNote}
                           onChange={e => setNewNote(e.target.value)}
                        ></textarea>
                        <button 
                           onClick={() => handleSaveNote(selectedRecord?._id)}
                           disabled={noteLoading || !newNote.trim()}
                           className="w-full mt-2 bg-gray-800 text-white font-bold py-2 rounded-lg hover:bg-gray-900 disabled:opacity-50"
                        >
                           {noteLoading ? 'Saving...' : 'Save Clinical Note'}
                        </button>
                        {selectedRecord && (
                           <button onClick={() => setSelectedRecord(null)} className="w-full mt-2 text-sm text-gray-500 underline">Back to General Notes</button>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Request More Records Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex justify-center items-center p-4">
           <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-xl font-bold mb-4">Request Additional Records</h3>
              <p className="text-sm text-gray-600 mb-4">Send a direct request to the patient for specific documents or an access extension.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Message to Patient</label>
                  <textarea 
                    className="w-full p-2 border rounded" 
                    rows="3" 
                    value={requestData.message}
                    onChange={e => setRequestData({...requestData, message: e.target.value})}
                    placeholder="e.g. Please share your recent MRI results and extend my access."
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Record Types Needed <span className="text-gray-400 text-xs">(comma separated)</span></label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={requestData.recordTypes}
                    onChange={e => setRequestData({...requestData, recordTypes: e.target.value})}
                    placeholder="MRI, Blood Test, Prescription"
                  />
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => setShowRequestModal(false)} className="px-4 py-2 bg-gray-200 rounded font-bold hover:bg-gray-300">Cancel</button>
                  <button onClick={handleSendRequest} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Send Request</button>
                </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default DoctorDashboard;