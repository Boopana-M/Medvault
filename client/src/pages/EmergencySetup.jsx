import { useState, useEffect } from 'react';
import { getEmergencyProfile, updateEmergencyProfile, getQRCode } from '../services/emergencyService';

const EmergencySetup = () => {
  const [profile, setProfile] = useState({
    bloodType: '',
    allergies: '',
    chronicConditions: '',
    currentMedications: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    organDonor: false,
    knownSurgeries: ''
  });
  
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchEmergencyData();
  }, []);

  const fetchEmergencyData = async () => {
    setLoading(true);
    try {
      const profileRes = await getEmergencyProfile().catch((e) => null);
      const profileData = profileRes?.data?.data;
      
      let hasData = false;
      if (profileData) {
        setProfile({
          bloodType: profileData.bloodType || '',
          allergies: profileData.allergies?.join(', ') || '',
          chronicConditions: profileData.chronicConditions?.join(', ') || '',
          currentMedications: profileData.currentMedications?.join(', ') || '',
          emergencyContactName: profileData.emergencyContactName || '',
          emergencyContactPhone: profileData.emergencyContactPhone || '',
          organDonor: profileData.organDonor || false,
          knownSurgeries: profileData.knownSurgeries?.join(', ') || ''
        });
        
        // Only consider it "hasData" if some important fields are filled
        if (profileData.bloodType || profileData.emergencyContactName || profileData.allergies?.length > 0) {
           hasData = true;
        }
      }
      
      // ONLY fetch QR code if they have actively saved data before
      if (hasData) {
        const qrRes = await getQRCode().catch((e) => null);
        if (qrRes?.data?.qrCodeDataUrl) {
          setQrCodeData(qrRes.data);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load emergency profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setProfile({ ...profile, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const profilePayload = {
      bloodType: profile.bloodType,
      allergies: profile.allergies.split(',').map(s => s.trim()).filter(s => s),
      chronicConditions: profile.chronicConditions.split(',').map(s => s.trim()).filter(s => s),
      currentMedications: profile.currentMedications.split(',').map(s => s.trim()).filter(s => s),
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
      organDonor: profile.organDonor,
      knownSurgeries: profile.knownSurgeries.split(',').map(s => s.trim()).filter(s => s),
    };

    try {
      await updateEmergencyProfile(profilePayload);
      setSuccess('Emergency profile saved successfully!');
      
      // Fetch new QR if wasn't there
      const qrRes = await getQRCode();
      if (qrRes.data.qrCodeDataUrl) {
        setQrCodeData(qrRes.data);
      }
    } catch (err) {
      setError('Failed to save emergency profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Emergency Card</title>
          <style>
             body { font-family: sans-serif; text-align: center; background: #fff; margin: 20px; }
             .card { border: 2px solid #ef4444; border-radius: 10px; width: 350px; margin: 0 auto; padding: 20px; outline: 5px solid #ef4444; outline-offset: -10px; }
             .title { color: #ef4444; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
             .qr-code { width: 200px; height: 200px; margin: 20px auto; }
             .instructions { font-size: 14px; color: #555; margin-top: 20px;}
          </style>
        </head>
        <body onload="window.print(); window.close()">
           <div class="card">
              <div class="title">EMERGENCY MEDICAL INFO</div>
              <p>Scan for life-saving medical details.</p>
              <img src="${qrCodeData.qrCodeDataUrl}" class="qr-code" />
              <div class="instructions">If found in emergency, please scan immediately.</div>
           </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) return <div className="text-center py-6">Loading profile...</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto my-6">
      <h2 className="text-2xl font-bold text-red-600 mb-6">Emergency Medical Setup</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
          {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Blood Type</label>
              <select 
                name="bloodType" 
                value={profile.bloodType} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="">Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-1">Emergency Contact Name</label>
              <input 
                type="text" 
                name="emergencyContactName" 
                value={profile.emergencyContactName} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="E.g., Jane Doe"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-1">Emergency Contact Phone</label>
              <input 
                type="text" 
                name="emergencyContactPhone" 
                value={profile.emergencyContactPhone} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Emergency number"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Allergies <span className="text-gray-500 font-normal">(comma separated)</span></label>
              <input 
                type="text" 
                name="allergies" 
                value={profile.allergies} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Penicillin, Peanuts"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-1">Chronic Conditions <span className="text-gray-500 font-normal">(comma separated)</span></label>
              <input 
                type="text" 
                name="chronicConditions" 
                value={profile.chronicConditions} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Diabetes, Asthma"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-1">Current Medications <span className="text-gray-500 font-normal">(comma separated)</span></label>
              <input 
                type="text" 
                name="currentMedications" 
                value={profile.currentMedications} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Insulin, Albuterol"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-1">Known Surgeries <span className="text-gray-500 font-normal">(comma separated)</span></label>
              <input 
                type="text" 
                name="knownSurgeries" 
                value={profile.knownSurgeries} 
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Appendectomy"
              />
            </div>
            
            <div className="flex items-center gap-2 mt-4">
              <input 
                type="checkbox" 
                name="organDonor" 
                checked={profile.organDonor} 
                onChange={handleChange}
                id="organDonor"
                className="w-4 h-4"
              />
              <label htmlFor="organDonor" className="text-sm font-semibold">Organ Donor</label>
            </div>
            
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Emergency Profile'}
            </button>
          </form>
        </div>
        
        {/* QR Code Display section */}
        <div className="flex flex-col items-center bg-gray-50 p-6 rounded-lg border-2 border-red-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Your Emergency QR</h3>
          
          {qrCodeData ? (
            <>
              <img src={qrCodeData.qrCodeDataUrl} alt="Emergency QR Code" className="w-48 h-48 mb-4 border-4 border-red-500 rounded p-2 bg-white" />
              
              <div className="flex flex-col gap-3 w-full max-w-xs mb-6">
                <a 
                  href={qrCodeData.qrCodeDataUrl} 
                  download="Emergency_QR.png"
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white text-center py-2 px-4 rounded font-semibold"
                >
                  Download PNG
                </a>
                <button 
                  onClick={handlePrint}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow shadow-red-300"
                >
                  Print Wallet Card
                </button>
                <a 
                  href={qrCodeData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center text-blue-600 underline mt-2 text-sm"
                >
                  Preview Emergency Page
                </a>
              </div>
              
              <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-md w-full">
                <strong>📝 Where to use this QR code:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Set it as your phone's lock screen wallpaper</li>
                  <li>Print and keep in your wallet behind your ID</li>
                  <li>Attach to your helmet if you ride a bike/motorcycle</li>
                  <li>Attach to your medical ID bracelet</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-10">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              <p>Save your profile first to generate your custom emergency QR code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencySetup;