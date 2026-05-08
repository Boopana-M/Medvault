import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicEmergencyInfo } from '../services/emergencyService';

const EmergencyPublic = () => {
  const { token } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getPublicEmergencyInfo(token);
        setProfile(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Emergency profile not found or invalid token.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">Loading emergency records...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center border-t-8 border-red-600">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-50 py-8 px-4 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-red-600">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 text-center">
          <h1 className="text-3xl font-black tracking-wider uppercase mb-2">EMERGENCY MEDICAL INFO</h1>
          <p className="font-semibold text-red-100">Confidential • For Responders Only</p>
        </div>
        
        {/* Main Content */}
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-8 border-b-2 border-gray-200 pb-8">
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-500 uppercase">Patient Name</p>
              <h2 className="text-3xl font-bold text-gray-800">{profile.name}</h2>
            </div>
            {profile.bloodType && (
              <div className="bg-red-100 rounded-lg p-4 text-center min-w-[120px] shadow-sm">
                <p className="text-xs font-bold text-red-800 uppercase mb-1">Blood Type</p>
                <div className="text-4xl font-black text-red-600">{profile.bloodType}</div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Section title="Allergies" items={profile.allergies} color="red" />
            <Section title="Chronic Conditions" items={profile.chronicConditions} color="orange" />
            <Section title="Current Medications" items={profile.currentMedications} color="blue" />
            <Section title="Known Surgeries" items={profile.knownSurgeries} color="gray" />
            
            {(profile.emergencyContactName || profile.emergencyContactPhone) && (
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mt-8">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                  <span className="text-xl mr-2">📞</span> Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.emergencyContactName && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Name</p>
                      <p className="text-lg font-medium text-gray-900">{profile.emergencyContactName}</p>
                    </div>
                  )}
                  {profile.emergencyContactPhone && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">Phone (Tap to call)</p>
                      <a href={`tel:${profile.emergencyContactPhone}`} className="text-xl font-bold text-blue-600 hover:underline">
                        {profile.emergencyContactPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {profile.organDonor && (
              <div className="mt-6 flex items-center bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="text-3xl mr-4">🫀</div>
                <div>
                  <h3 className="font-bold text-green-800">Registered Organ Donor</h3>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-100 p-4 text-center text-xs text-gray-500">
          Last updated: {new Date(profile.updatedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

// Helper component for list sections
const Section = ({ title, items, color }) => {
  if (!items || items.length === 0) return null;
  
  const colors = {
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <span key={idx} className={`px-3 py-1 rounded-full text-sm font-semibold ${colors[color] || colors.gray}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default EmergencyPublic;