import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'PATIENT' | 'DRIVER' | 'ADMIN_HOSPITAL' | 'SUPER_ADMIN';
  phone?: string;
  patientProfile?: {
    bloodGroup: string;
    allergies?: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    medicalNotes?: string;
  };
  ambulance?: {
    id: string;
    vehicleNumber: string;
    ambulanceType: 'BASIC_LIFE_SUPPORT' | 'ADVANCED_LIFE_SUPPORT' | 'OXYGEN_SUPPORT';
    isAvailable: boolean;
    currentLat: number;
    currentLng: number;
    licenseNumber?: string;
    licenseDoc?: string;
    registrationDoc?: string;
    verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
  hospital?: {
    id: string;
    name: string;
    address: string;
    contactNumber: string;
    lat: number;
    lng: number;
    availableBeds: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lifelink_token'));
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('lifelink_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:5000/api';

  // Silent refresh session restore
  const refreshSession = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('lifelink_token', data.token);
        localStorage.setItem('lifelink_user', JSON.stringify(data.user));
        return data.token;
      } else {
        // If cookie refresh fails and there is no active localStorage token, clear
        if (!localStorage.getItem('lifelink_token')) {
          setToken(null);
          setUser(null);
          localStorage.removeItem('lifelink_user');
        }
      }
    } catch (err) {
      console.error('Silent refresh failed:', err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      await refreshSession();
      setLoading(false);
    };
    initializeAuth();

    // Refresh token every 14 minutes silently
    const interval = setInterval(async () => {
      await refreshSession();
    }, 14 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('lifelink_token', newToken);
    localStorage.setItem('lifelink_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    localStorage.removeItem('lifelink_token');
    localStorage.removeItem('lifelink_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (!user) return;
    const merged = { ...user, ...updatedUser } as User;
    localStorage.setItem('lifelink_user', JSON.stringify(merged));
    setUser(merged);
  };

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    const activeToken = token || localStorage.getItem('lifelink_token');
    if (activeToken) {
      headers.set('Authorization', `Bearer ${activeToken}`);
    }
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      credentials: 'include',
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Session expired, clear state
      setToken(null);
      setUser(null);
      localStorage.removeItem('lifelink_token');
      localStorage.removeItem('lifelink_user');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Request failed');
    }

    return response.json().catch(() => null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
