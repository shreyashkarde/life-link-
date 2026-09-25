/**
 * 🌐 Enterprise Dynamic Backend URL Resolver
 * 
 * Guarantees that localhost and deployed production versions connect seamlessly:
 * 1. Honors runtime localStorage override ('VITE_BACKEND_URL' or 'BACKEND_URL')
 * 2. Reads import.meta.env.VITE_BACKEND_URL / VITE_API_URL
 * 3. Strips trailing slashes to eliminate double-slash routing bugs
 * 4. In production environments, guards against fallback to 'http://localhost:5000'
 */

export const getBackendUrl = (): string => {
  // 1. Runtime override stored in browser (allows instant switching if deployed separately)
  if (typeof window !== 'undefined') {
    try {
      const stored =
        localStorage.getItem('VITE_BACKEND_URL') ||
        sessionStorage.getItem('VITE_BACKEND_URL') ||
        localStorage.getItem('BACKEND_URL');
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch {
      // localStorage may be disabled
    }
  }

  // 2. Read Vite environment variable
  const rawEnv = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || '').trim();
  if (rawEnv) {
    const cleanUrl = rawEnv.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    // If we're on localhost or the URL is a real remote URL, use it
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal || cleanUrl.startsWith('https://') || cleanUrl.startsWith('http://')) {
        return cleanUrl;
      }
    } else {
      return cleanUrl;
    }
  }

  // 3. Fallback logic:
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      // In production (Vercel/Render), if no remote URL was provided in build, default to same origin
      return window.location.origin.replace(/\/+$/, '');
    }
  }

  return 'http://localhost:5000';
};

export const setCustomBackendUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem('VITE_BACKEND_URL', clean);
      sessionStorage.setItem('VITE_BACKEND_URL', clean);
    } else {
      localStorage.removeItem('VITE_BACKEND_URL');
      sessionStorage.removeItem('VITE_BACKEND_URL');
    }
  }
};

export default getBackendUrl;
