import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { authAPI } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: { email: string; password?: string }) => Promise<User>;
  register: (userData: any) => Promise<User>;
  googleLogin: (googleData: any) => Promise<User>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
  isPatient: boolean;
  isDoctor: boolean;
  isDriver: boolean;
  isHospitalAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lifelink_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lifelink_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await authAPI.getProfile();
          if (res.data.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('lifelink_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('[AuthContext] Session expired or invalid');
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const saveAuthData = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('lifelink_token', newToken);
    localStorage.setItem('lifelink_user', JSON.stringify(newUser));
  };

  const login = async (credentials: { email: string; password?: string }): Promise<User> => {
    const res = await authAPI.login(credentials);
    const { token: newToken, user: newUser } = res.data;
    saveAuthData(newToken, newUser);
    return newUser;
  };

  const register = async (userData: any): Promise<User> => {
    const res = await authAPI.register(userData);
    const { token: newToken, user: newUser } = res.data;
    saveAuthData(newToken, newUser);
    return newUser;
  };

  const googleLogin = async (googleData: any): Promise<User> => {
    const res = await authAPI.googleLogin(googleData);
    const { token: newToken, user: newUser } = res.data;
    saveAuthData(newToken, newUser);
    return newUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lifelink_token');
    localStorage.removeItem('lifelink_user');
  };

  const role: UserRole | undefined = user?.role;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        googleLogin,
        logout,
        setUser,
        isAuthenticated: !!user,
        isPatient: role === 'PATIENT',
        isDoctor: role === 'DOCTOR',
        isDriver: role === 'DRIVER',
        isHospitalAdmin: role === 'ADMIN_HOSPITAL',
        isSuperAdmin: role === 'SUPER_ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
