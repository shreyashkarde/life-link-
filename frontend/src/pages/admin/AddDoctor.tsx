import React, { useState } from 'react';
import axios from 'axios';
import { useApp } from '../../context/AppContext';

export const AddDoctor: React.FC = () => {
  const { aToken, backendUrl, showToast, getDoctorsData } = useApp();

  const [docImg, setDocImg] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [experience, setExperience] = useState('1 Year');
  const [fees, setFees] = useState('');
  const [about, setAbout] = useState('');
  const [speciality, setSpeciality] = useState('General physician');
  const [degree, setDegree] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        speciality,
        degree,
        experience,
        about,
        fees: Number(fees),
        address: {
          line1: address1 || '17th Cross, Richmond',
          line2: address2 || 'Circle, Ring Road, London',
        },
        image:
          docImg ||
          'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400',
      };

      const { data } = await axios.post(`${backendUrl}/api/admin/add-doctor`, payload, {
        headers: { atoken: aToken },
      });

      if (data.success) {
        showToast('Doctor added successfully!', 'success');
        setName('');
        setEmail('');
        setPassword('');
        setFees('');
        setDegree('');
        setAbout('');
        setAddress1('');
        setAddress2('');
        setDocImg('');
        getDoctorsData();
      } else {
        showToast(data.message || 'Failed to add doctor', 'error');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error adding doctor', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmitHandler} className="m-2 sm:m-5 w-full max-w-4xl">
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Onboard New Doctor</h1>
        <p className="text-xs text-gray-500 mt-1">Register a new verified physician into the Prescripto booking system.</p>
      </div>

      <div className="bg-white p-8 sm:p-10 border-2 border-gray-100 rounded-3xl w-full shadow-sm max-h-[85vh] overflow-y-scroll">
        {/* Doctor Image URL */}
        <div className="flex items-center gap-5 mb-8 p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl">
          <img
            className="w-16 h-16 bg-white rounded-2xl object-cover border-2 border-indigo-100 shadow-sm"
            src={docImg || 'https://cdn-icons-png.flaticon.com/512/387/387561.png'}
            alt="Upload Preview"
          />
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-700 block mb-1">Doctor Photo URL</label>
            <input
              type="text"
              placeholder="Paste public photo link, e.g. https://images.unsplash.com/..."
              className="border-2 border-gray-200 rounded-xl px-3.5 py-2 text-xs w-full max-w-md focus:border-primary focus:outline-none bg-white font-medium"
              value={docImg}
              onChange={(e) => setDocImg(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700 text-sm">
          {/* Left Column */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1">Full Doctor Name</label>
              <input
                className="border-2 border-gray-200 rounded-xl px-3.5 py-2.5 w-full focus:border-primary focus:outline-none"
                type="text"
                placeholder="Dr. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1">Doctor Email Address</label>
              <input
                className="border-2 border-gray-200 rounded-xl px-3.5 py-2.5 w-full focus:border-primary focus:outline-none"
                type="email"
                placeholder="doctor@prescripto.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1">Initial Password</label>
              <input
                className="border-2 border-gray-200 rounded-xl px-3.5 py-2.5 w-full focus:border-primary focus:outline-none"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1">Clinical Experience</label>
              <select
                className="border-2 border-gray-200 rounded-xl px-3.5 py-2.5 w-full focus:border-primary focus:outline-none bg-white font-semibold text-xs"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                <option value="1 Year">1 Year</option>
                <option value="2 Years">2 Years</option>
                <option value="3 Years">3 Years</option>
                <option value="4 Years">4 Years</option>
                <option value="5 Years">5 Years</option>
                <option value="6 Years">6 Years</option>
                <option value="8 Years">8 Years</option>
                <option value="10+ Years">10+ Years</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1">Consultation Fees ($)</label>
              <input
                className="border-2 border-gray-200 rounded-xl px-3.5 py-2.5 w-full focus:border-primary focus:outline-none font-bold text-base"
                type="number"
                placeholder="e.g. 50"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1">Speciality Category</label>
              <select
                className="border-2 border-gray-200 rounded-xl px-3.5 py-2.5 w-full focus:border-primary focus:outline-none bg-white font-semibold text-xs"
                value={speciality}
                onChange={(e) => setSpeciality(e.target.value)}
              >
                <option value="General physician">General physician</option>
                <option value="Gynecologist">Gynecologist</option>
                <option value="Dermatologist">Dermatologist</option>
                <option value="Pediatricians">Pediatricians</option>
                <option value="Neurologist">Neurologist</option>
                <option value="Gastroenterologist">Gastroenterologist</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1">Medical Degree & Qualifications</label>
              <input
                className="border-2 border-gray-200 rounded-xl px-3.5 py-2.5 w-full focus:border-primary focus:outline-none"
                type="text"
                placeholder="e.g. MBBS, MD, DM"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 text-xs block mb-1">Clinic Address</label>
              <input
                className="border-2 border-gray-200 rounded-xl px-3.5 py-2 w-full focus:border-primary focus:outline-none mb-2 text-xs"
                type="text"
                placeholder="Address line 1 (e.g. 17th Cross, Richmond)"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                required
              />
              <input
                className="border-2 border-gray-200 rounded-xl px-3.5 py-2 w-full focus:border-primary focus:outline-none text-xs"
                type="text"
                placeholder="Address line 2 (e.g. Circle, Ring Road, London)"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="mt-5">
          <label className="font-bold text-gray-700 text-xs block mb-1">Professional Bio & About</label>
          <textarea
            className="w-full border-2 border-gray-200 rounded-xl p-3.5 focus:border-primary focus:outline-none text-xs leading-5"
            placeholder="Write a brief professional summary about the doctor's approach, specializations, and patient care..."
            rows={4}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            required
          />
        </div>

        {/* Submit Button */}
        <div className="pt-6 mt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-[#4a58eb] text-white font-bold px-10 py-3.5 rounded-full shadow-lg hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            <span>{loading ? 'Registering Doctor...' : 'Confirm & Add Doctor'}</span>
            <span>+</span>
          </button>
        </div>
      </div>
    </form>
  );
};

export default AddDoctor;
