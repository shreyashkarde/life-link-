/**
 * 🔒 tokenService.js (Frontend In-Memory Token Manager)
 * Strict Security Enforcement:
 * - Access token is stored strictly IN-MEMORY (never in localStorage or sessionStorage)
 * - Long-lived refresh token is managed exclusively via secure HTTP-Only cookies
 * - Auto-refreshes expired access tokens silently via /api/auth/refresh
 */

let inMemoryAccessToken = null;
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export class TokenManager {
  /**
   * Retrieves the in-memory access token
   */
  static getAccessToken() {
    return inMemoryAccessToken;
  }

  /**
   * Sets the short-lived access token in-memory
   */
  static setAccessToken(token) {
    inMemoryAccessToken = token;
  }

  /**
   * Checks if an access token is currently available
   */
  static hasAccessToken() {
    return Boolean(inMemoryAccessToken);
  }

  /**
   * Clears in-memory token
   */
  static clearAccessToken() {
    inMemoryAccessToken = null;
  }

  /**
   * Silent Token Refresh
   * Calls /api/auth/refresh with credentials: 'include'
   * The browser automatically transmits the secure HTTP-Only refreshToken cookie.
   */
  static async silentRefresh() {
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((token) => resolve(token));
      });
    }

    isRefreshing = true;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Transmits HTTP-only refreshToken cookie
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (data.success && data.accessToken) {
        this.setAccessToken(data.accessToken);
        onRefreshed(data.accessToken);
        return data.accessToken;
      } else {
        this.clearAccessToken();
        return null;
      }
    } catch (err) {
      console.error('Silent token refresh failed:', err);
      this.clearAccessToken();
      return null;
    } finally {
      isRefreshing = false;
    }
  }

  /**
   * Authenticated fetch helper
   * Automatically attaches in-memory Bearer token
   * On 401, attempts silent refresh and retries once
   */
  static async secureFetch(url, options = {}) {
    let token = this.getAccessToken();

    // If no token in memory, attempt silent refresh first
    if (!token) {
      token = await this.silentRefresh();
    }

    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    let response = await fetch(url, { ...options, headers, credentials: 'include' });

    // Handle token expiration: 401 -> silent refresh -> retry once
    if (response.status === 401) {
      const newToken = await this.silentRefresh();
      if (newToken) {
        const retryHeaders = {
          ...(options.headers || {}),
          Authorization: `Bearer ${newToken}`,
        };
        response = await fetch(url, { ...options, headers: retryHeaders, credentials: 'include' });
      }
    }

    return response;
  }

  /**
   * Logout: Clears in-memory token and asks server to clear HTTP-only cookie
   */
  static async logout() {
    this.clearAccessToken();
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      await fetch(`${backendUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    }
  }
}

export default TokenManager;
