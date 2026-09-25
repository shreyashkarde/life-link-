import React, { createContext, useState, useEffect, useRef, ReactNode, useContext, useCallback } from 'react';
import apiClient from '../services/apiClient';
import socketService from '../services/socket';
import { DoctorItem } from '../assets/assets';
import { getBackendUrl } from '../config/backendUrl';

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
  logoutAll: () => Promise<void>;
  clearAllSystemData: () => Promise<boolean>;
  refreshVersion: number;
  triggerGlobalRefresh: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const AppContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const currencySymbol = '$';
  const backendUrl = getBackendUrl();

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [token, setTokenState] = useState<string>(sessionStorage.getItem('token') || localStorage.getItem('token') || '');
  const [userData, setUserData] = useState<any>(null);

  // Admin & Doctor tokens (Tab-isolated via sessionStorage)
  const [aToken, setATokenState] = useState<string>(sessionStorage.getItem('aToken') || localStorage.getItem('aToken') || '');
  const [dToken, setDTokenState] = useState<string>(sessionStorage.getItem('dToken') || localStorage.getItem('dToken') || '');
  const [doctorData, setDoctorData] = useState<any>(null);

  // Global refresh synchronization counter
  const [refreshVersion, setRefreshVersion] = useState<number>(0);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const profileFetchTokenRef = useRef<string>('');

  const triggerGlobalRefresh = useCallback(() => {
    setRefreshVersion((prev) => prev + 1);
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
      localStorage.setItem('token', newToken);
    } else {
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      setUserData(null);
    }
  };

  const setAToken = (newToken: string) => {
    setATokenState(newToken);
    if (newToken) {
      sessionStorage.setItem('aToken', newToken);
      localStorage.setItem('aToken', newToken);
    } else {
      sessionStorage.removeItem('aToken');
      localStorage.removeItem('aToken');
    }
  };

  const setDToken = (newToken: string) => {
    setDTokenState(newToken);
    if (newToken) {
      sessionStorage.setItem('dToken', newToken);
      localStorage.setItem('dToken', newToken);
    } else {
      sessionStorage.removeItem('dToken');
      localStorage.removeItem('dToken');
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
      await apiClient.post('/api/auth/logout');
    } catch {
      // Silent error suppression
    }
  };

  // Fetch doctors list from API (strictly synced with database)
  const getDoctorsData = useCallback(async () => {
    try {
      console.log('🔄 [State Sync] Fetching latest doctors roster from DB...');
      const { data } = await apiClient.get('/api/doctor/list');
      if (data.success && Array.isArray(data.doctors)) {
        console.log(`✅ [State Sync] Received ${data.doctors.length} doctors from DB`);
        setDoctors(data.doctors);
      } else {
        setDoctors([]);
      }
    } catch (err) {
      console.error('❌ [State Sync Error] Could not fetch doctors:', err);
      setDoctors([]);
    }
  }, []);

  // Fetch user profile data
  const loadUserProfileData = useCallback(async () => {
    const currentToken = token || sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!currentToken) return;
    try {
      const { data } = await apiClient.get('/api/user/get-profile');
      if (data.success && data.userData) {
        setUserData(data.userData);
      }
    } catch {
      // Silent handling
    }
  }, [token]);

  // System Data Wipe action with instant state reset & socket broadcast sync
  const clearAllSystemData = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🧹 [DB Sync] Executing POST /api/admin/clear-all-data...');
      const { data } = await apiClient.post('/api/admin/clear-all-data');
      if (data.success) {
        console.log('✅ [DB Sync] Clear all data successful. Resetting state & refetching...');
        await getDoctorsData();
        triggerGlobalRefresh();
        showToast('✓ All test & dynamic data cleared successfully! UI synchronized.', 'success');
        return true;
      } else {
        showToast(data.message || 'Failed to clear data', 'error');
        return false;
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Error clearing database', 'error');
      return false;
    }
  }, [getDoctorsData, triggerGlobalRefresh]);

  // Initial doctors load
  useEffect(() => {
    getDoctorsData();
  }, [getDoctorsData]);

  // User Profile synchronization
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
  }, [token, loadUserProfileData]);

  // Global Real-Time Socket.IO Synchronization (Listens to dataCleared & new updates)
  useEffect(() => {
    const s = socketService.connect();

    // Listen for system-wide database clear events
    socketService.onDataCleared(() => {
      console.log('📡 [Global Sync] Received dataCleared from Socket.io! Refetching all datasets...');
      getDoctorsData();
      triggerGlobalRefresh();
      showToast('Database reset detected. State synchronized with backend.', 'info');
    });

    return () => {
      // Keep connection managed
    };
  }, [getDoctorsData, triggerGlobalRefresh]);

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
    clearAllSystemData,
    refreshVersion,
    triggerGlobalRefresh,
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
