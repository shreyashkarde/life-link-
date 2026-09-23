import React, { createContext, useState, useEffect, useRef, ReactNode, useContext } from 'react';
import axios from 'axios';
import { DoctorItem, fallbackDoctors } from '../assets/assets';

export interface AppContextType {
  doctors: DoctorItem[];
  getDoctorsData: () => Promise<void>;
  currencySymbol: string;
  backendUrl: string;
  token: string;
  setToken: (token: string) => void;
  userData: any;
  setUserData: React.Dispatch<React.SetStateAction<any>>;
  loadUserProfileData: () => Promise<void>;
  // Admin & Doctor Auth
  aToken: string;
  setAToken: (token: string) => void;
  dToken: string;
  setDToken: (token: string) => void;
  doctorData: any;
  setDoctorData: React.Dispatch<React.SetStateAction<any>>;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  logoutAll: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const currencySymbol = '$';
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [token, setTokenState] = useState<string>(sessionStorage.getItem('token') || '');
  const [userData, setUserData] = useState<any>(null);

  // Admin & Doctor tokens (Tab-isolated via sessionStorage)
  const [aToken, setATokenState] = useState<string>(sessionStorage.getItem('aToken') || '');
  const [dToken, setDTokenState] = useState<string>(sessionStorage.getItem('dToken') || '');
  const [doctorData, setDoctorData] = useState<any>(null);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const doctorsFetchedRef = useRef<boolean>(false);
  const profileFetchTokenRef = useRef<string>('');

  // Clear any legacy persistent tokens on startup to prevent auto-login leaks
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('aToken');
    localStorage.removeItem('dToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userData');
    localStorage.removeItem('role');
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const setToken = (newToken: string) => {
    setTokenState(newToken);
    if (newToken) {
      sessionStorage.setItem('token', newToken);
    } else {
      sessionStorage.removeItem('token');
      setUserData(null);
    }
  };

  const setAToken = (newToken: string) => {
    setATokenState(newToken);
    if (newToken) {
      sessionStorage.setItem('aToken', newToken);
    } else {
      sessionStorage.removeItem('aToken');
    }
  };

  const setDToken = (newToken: string) => {
    setDTokenState(newToken);
    if (newToken) {
      sessionStorage.setItem('dToken', newToken);
    } else {
      sessionStorage.removeItem('dToken');
      setDoctorData(null);
    }
  };

  const logoutAll = async () => {
    setTokenState('');
    setATokenState('');
    setDTokenState('');
    setUserData(null);
    setDoctorData(null);
    profileFetchTokenRef.current = '';

    sessionStorage.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('aToken');
    localStorage.removeItem('dToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userData');
    localStorage.removeItem('role');

    try {
      await axios.post(`${backendUrl}/api/auth/logout`, {}, { withCredentials: true });
    } catch {
      // Silent error suppression
    }
  };


  // Fetch doctors list from API (strictly synced with database)
  const getDoctorsData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/list`);
      if (data.success && Array.isArray(data.doctors)) {
        setDoctors(data.doctors);
      } else {
        setDoctors([]);
      }
    } catch {
      setDoctors([]);
    }
  };

  // Fetch user profile data
  const loadUserProfileData = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/get-profile`, {
        headers: { token },
      });
      if (data.success) {
        setUserData(data.userData);
      }
    } catch {
      // Silent handling
    }
  };

  useEffect(() => {
    if (!doctorsFetchedRef.current) {
      doctorsFetchedRef.current = true;
      getDoctorsData();
    }
  }, []);

  useEffect(() => {
    if (token) {
      if (profileFetchTokenRef.current !== token) {
        profileFetchTokenRef.current = token;
        loadUserProfileData();
      }
    } else {
      profileFetchTokenRef.current = '';
      setUserData(null);
    }
  }, [token]);


  const value: AppContextType = {
    doctors,
    getDoctorsData,
    currencySymbol,
    backendUrl,
    token,
    setToken,
    userData,
    setUserData,
    loadUserProfileData,
    aToken,
    setAToken,
    dToken,
    setDToken,
    doctorData,
    setDoctorData,
    toast,
    showToast,
    logoutAll,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {/* Toast Alert UI */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce transition-all">
          <div
            className={`px-5 py-3 rounded-lg shadow-xl text-white font-medium text-sm flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-600'
                : toast.type === 'error'
                ? 'bg-rose-600'
                : 'bg-primary'
            }`}
          >
            <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
};

export default AppContextProvider;
