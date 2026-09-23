import React, { useState } from 'react';
import axios from 'axios';
import { useApp } from '../context/AppContext';
import { assets } from '../assets/assets';

export const MyProfile: React.FC = () => {
  const { userData, setUserData, token, backendUrl, loadUserProfileData, showToast } = useApp();
  const [isEdit, setIsEdit] = useState(false);
  const [image, setImage] = useState('');
  const [loading, setLoading] = useState(false);

  const updateUserProfile = async () => {
    try {
      setLoading(true);
      const updatePayload = {
        name: userData.name,
        phone: userData.phone,
        address: userData.address,
        gender: userData.gender,
        dob: userData.dob,
        image: image || userData.image,
      };

      const { data } = await axios.post(
        `${backendUrl}/api/user/update-profile`,
        updatePayload,
        { headers: { token } }
      );

      if (data.success) {
        showToast('Profile updated successfully!', 'success');
        await loadUserProfileData();
        setIsEdit(false);
      } else {
        showToast(data.message || 'Failed to update profile', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error updating profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="py-20 text-center text-gray-500">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg flex flex-col gap-3 text-sm pt-5">
      {/* Profile Photo */}
      <div className="relative inline-block w-36">
        <img
          className="w-36 h-36 rounded-2xl object-cover border-2 border-primary/20 shadow-sm"
          src={image || userData.image || assets.profile_pic}
          alt="User Profile"
        />
        {isEdit && (
          <div className="mt-2">
            <input
              type="text"
              placeholder="Paste Image URL"
              className="text-xs border p-1 rounded w-full"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* User Name */}
      {isEdit ? (
        <input
          className="bg-gray-50 text-3xl font-medium max-w-60 mt-4 p-1 border rounded"
          type="text"
          value={userData.name}
          onChange={(e) => setUserData((prev: any) => ({ ...prev, name: e.target.value }))}
        />
      ) : (
        <p className="font-semibold text-3xl text-neutral-800 mt-4">{userData.name}</p>
      )}

      <hr className="bg-zinc-400 h-[1px] border-none my-2" />

      {/* Contact Information */}
      <div>
        <p className="text-neutral-500 underline uppercase text-xs font-bold tracking-wider mb-3">
          CONTACT INFORMATION
        </p>
        <div className="grid grid-cols-[1fr_3fr] gap-y-3 text-neutral-700">
          <p className="font-medium">Email id:</p>
          <p className="text-primary font-medium">{userData.email}</p>

          <p className="font-medium">Phone:</p>
          {isEdit ? (
            <input
              className="bg-gray-100 max-w-52 p-1 rounded"
              type="text"
              value={userData.phone || ''}
              onChange={(e) => setUserData((prev: any) => ({ ...prev, phone: e.target.value }))}
            />
          ) : (
            <p className="text-blue-500">{userData.phone || 'Not added'}</p>
          )}

          <p className="font-medium">Address:</p>
          {isEdit ? (
            <div className="flex flex-col gap-1">
              <input
                className="bg-gray-100 p-1 rounded text-xs"
                type="text"
                placeholder="Address Line 1"
                value={userData.address?.line1 || ''}
                onChange={(e) =>
                  setUserData((prev: any) => ({
                    ...prev,
                    address: { ...(prev.address || {}), line1: e.target.value },
                  }))
                }
              />
              <input
                className="bg-gray-100 p-1 rounded text-xs"
                type="text"
                placeholder="Address Line 2"
                value={userData.address?.line2 || ''}
                onChange={(e) =>
                  setUserData((prev: any) => ({
                    ...prev,
                    address: { ...(prev.address || {}), line2: e.target.value },
                  }))
                }
              />
            </div>
          ) : (
            <p className="text-gray-600">
              {userData.address?.line1 || 'No address added'}
              <br />
              {userData.address?.line2}
            </p>
          )}
        </div>
      </div>

      <hr className="bg-zinc-400 h-[1px] border-none my-2" />

      {/* Basic Information */}
      <div>
        <p className="text-neutral-500 underline uppercase text-xs font-bold tracking-wider mb-3">
          BASIC INFORMATION
        </p>
        <div className="grid grid-cols-[1fr_3fr] gap-y-3 text-neutral-700">
          <p className="font-medium">Gender:</p>
          {isEdit ? (
            <select
              className="max-w-28 bg-gray-100 p-1 rounded"
              value={userData.gender || 'Not Selected'}
              onChange={(e) => setUserData((prev: any) => ({ ...prev, gender: e.target.value }))}
            >
              <option value="Not Selected">Not Selected</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          ) : (
            <p className="text-gray-600">{userData.gender || 'Not Selected'}</p>
          )}

          <p className="font-medium">Birthday:</p>
          {isEdit ? (
            <input
              className="max-w-36 bg-gray-100 p-1 rounded"
              type="date"
              value={userData.dob || ''}
              onChange={(e) => setUserData((prev: any) => ({ ...prev, dob: e.target.value }))}
            />
          ) : (
            <p className="text-gray-600">{userData.dob || 'Not Selected'}</p>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-8 flex gap-3">
        {isEdit ? (
          <>
            <button
              onClick={updateUserProfile}
              disabled={loading}
              className="bg-primary hover:bg-[#4a58eb] text-white px-8 py-3 rounded-full font-bold text-xs shadow-md hover:shadow-primary/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Saving Changes...' : 'Save Information'}
            </button>
            <button
              onClick={() => setIsEdit(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-full font-bold text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEdit(true)}
            className="bg-primary hover:bg-[#4a58eb] text-white px-8 py-3 rounded-full font-bold text-xs shadow-md hover:shadow-primary/30 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>✏️</span>
            <span>Edit Profile</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MyProfile;
