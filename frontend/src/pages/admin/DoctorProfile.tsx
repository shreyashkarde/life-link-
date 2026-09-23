import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useApp } from '../../context/AppContext';

export const DoctorProfile: React.FC = () => {
  const { dToken, backendUrl, showToast } = useApp();
  const [profileData, setProfileData] = useState<any>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(false);

  const getProfileData = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/doctor/profile`, {
        headers: { dtoken: dToken },
      });
      if (data.success) {
        setProfileData(data.profileData);
      }
    } catch (error: any) {
      console.error('Error fetching doctor profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      const updateData = {
        fees: profileData.fees,
        address: profileData.address,
        available: profileData.available,
      };

      const { data } = await axios.post(
        `${backendUrl}/api/doctor/update-profile`,
        updateData,
        { headers: { dtoken: dToken } }
      );

      if (data.success) {
        showToast('Profile updated successfully!', 'success');
        setIsEdit(false);
        getProfileData();
      } else {
        showToast(data.message || 'Update failed', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error updating doctor profile', 'error');
    }
  };

  useEffect(() => {
    if (dToken) {
      getProfileData();
    }
  }, [dToken]);

  if (loading && !profileData) {
    return (
      <div className="py-20 text-center text-gray-500">
        <p>Loading doctor profile...</p>
      </div>
    );
  }

  return (
    profileData && (
      <div className="m-2 sm:m-5 max-w-4xl">
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Physician Practice Profile</h1>
          <p className="text-xs text-gray-500 mt-1">Configure consultation pricing, clinic location, and patient booking availability.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:max-w-64 bg-gradient-to-b from-primary to-indigo-700 rounded-3xl overflow-hidden shadow-lg p-2 flex items-center justify-center self-start">
            <img
              className="w-full h-auto object-cover object-top rounded-2xl max-h-80"
              src={profileData.image}
              alt={profileData.name}
            />
          </div>

          <div className="flex-1 border-2 border-gray-100 rounded-3xl p-8 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <p>{profileData.name}</p>
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                  ✓
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1.5 text-gray-600 text-sm">
                <p className="font-semibold text-primary">
                  {profileData.degree} - {profileData.speciality}
                </p>
                <span className="py-0.5 px-2.5 border border-gray-300 bg-gray-50 text-xs rounded-full font-bold">
                  {profileData.experience}
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">About Practitioner</p>
                <p className="text-xs text-gray-500 mt-1 leading-5">
                  {profileData.about}
                </p>
              </div>

              {/* Consultation Fee */}
              <div className="mt-5 p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500">Consultation Fee</label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xl font-bold text-gray-800">$</span>
                    {isEdit ? (
                      <input
                        type="number"
                        className="border-2 border-primary rounded-lg px-2 py-1 w-24 text-base font-bold text-gray-900 bg-white"
                        onChange={(e) =>
                          setProfileData((prev: any) => ({ ...prev, fees: e.target.value }))
                        }
                        value={profileData.fees}
                      />
                    ) : (
                      <span className="text-2xl font-black text-gray-900">{profileData.fees}</span>
                    )}
                  </div>
                </div>

                {/* Availability Toggle */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-700">Patient Booking</p>
                    <p className="text-[11px] text-gray-400">
                      {profileData.available ? 'Currently accepting' : 'Paused / Offline'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={profileData.available}
                    onChange={() =>
                      isEdit &&
                      setProfileData((prev: any) => ({
                        ...prev,
                        available: !prev.available,
                      }))
                    }
                    disabled={!isEdit}
                    className="w-5 h-5 text-primary rounded cursor-pointer accent-primary"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="mt-5">
                <label className="text-xs font-bold uppercase text-gray-500 block mb-1">Clinic Address</label>
                {isEdit ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      className="border-2 border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-primary focus:outline-none"
                      onChange={(e) =>
                        setProfileData((prev: any) => ({
                          ...prev,
                          address: { ...prev.address, line1: e.target.value },
                        }))
                      }
                      value={profileData.address?.line1 || ''}
                    />
                    <input
                      type="text"
                      className="border-2 border-gray-200 rounded-xl px-3 py-2 text-xs focus:border-primary focus:outline-none"
                      onChange={(e) =>
                        setProfileData((prev: any) => ({
                          ...prev,
                          address: { ...prev.address, line2: e.target.value },
                        }))
                      }
                      value={profileData.address?.line2 || ''}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200 font-medium">
                    {profileData.address?.line1} <br />
                    {profileData.address?.line2}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-4 border-t border-gray-100 flex gap-3">
              {isEdit ? (
                <>
                  <button
                    onClick={updateProfile}
                    className="bg-primary hover:bg-[#4a58eb] text-white px-8 py-2.5 rounded-full text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEdit(false)}
                    className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-full text-xs font-bold hover:bg-gray-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEdit(true)}
                  className="bg-primary hover:bg-[#4a58eb] text-white px-8 py-2.5 rounded-full text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>✏️</span>
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default DoctorProfile;
