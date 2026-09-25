import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getBackendUrl } from '../config/backendUrl';

/**
 * 🚀 Centralized Enterprise Axios API Client
 * - Automatic baseURL resolution
 * - withCredentials enabled for cookie-based session/refresh tokens
 * - Multi-token injection interceptors (token, aToken, dToken, x-hospital-id)
 * - Cache-Control: no-store headers on all requests & responses
 * - Transparent debugging logs for API hits, status, and payload flow
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: getBackendUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request Interceptor: Injects authentication tokens & disables browser caching
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Dynamically guarantee latest resolved backend URL
    config.baseURL = getBackendUrl();
    // 1. Extract tokens from sessionStorage (preferred) and localStorage (fallback)
    const token =
      sessionStorage.getItem('token') ||
      localStorage.getItem('token') ||
      '';
    const aToken =
      sessionStorage.getItem('aToken') ||
      localStorage.getItem('aToken') ||
      '';
    const dToken =
      sessionStorage.getItem('dToken') ||
      localStorage.getItem('dToken') ||
      '';
    const hospitalId =
      sessionStorage.getItem('hospitalId') ||
      localStorage.getItem('hospitalId') ||
      '';

    // 2. Attach tokens to request headers
    const activeToken = token || dToken || aToken;
    if (activeToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${activeToken}`;
    }

    if (token) {
      config.headers['token'] = token;
    }

    if (aToken) {
      config.headers['atoken'] = aToken;
      config.headers['aToken'] = aToken;
    }

    if (dToken) {
      config.headers['dtoken'] = dToken;
      config.headers['dToken'] = dToken;
    }

    if (hospitalId) {
      config.headers['x-hospital-id'] = hospitalId;
    }

    // 3. Cache-busting query parameter for GET requests to strictly prevent stale data
    if (config.method === 'get') {
      config.params = {
        _t: Date.now(),
        ...(config.params || {}),
      };
    }

    // 4. Debugging Log: API Hit
    console.log(
      `🌐 [API Request] [${config.method?.toUpperCase()}] ${config.baseURL || ''}${config.url}`,
      {
        params: config.params,
        data: config.data,
        hasToken: !!token,
        hasAToken: !!aToken,
        hasDToken: !!dToken,
      }
    );

    return config;
  },
  (error) => {
    console.error('❌ [API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Fresh DB data verification & unified error logging
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Debugging Log: DB / API Response
    console.log(
      `✅ [API Response] [${response.config.method?.toUpperCase()}] ${response.config.url} [Status: ${response.status}]`,
      response.data
    );
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const errorData = error.response?.data;

    console.error(
      `⚠️ [API Error] [${method}] ${url} [Status: ${status || 'NETWORK_ERROR'}]:`,
      errorData || error.message
    );

    return Promise.reject(error);
  }
);

export default apiClient;
