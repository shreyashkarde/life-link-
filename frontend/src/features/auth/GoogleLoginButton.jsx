import React, { useState, useEffect, useRef } from 'react';
import { getBackendUrl } from '../../config/backendUrl';

/**
 * 🔑 GoogleLoginButton.jsx
 * Native Google OAuth 2.0 Integration with Official Account Selector Popup
 * Opens Google's official "Choose an Account" dialog directly.
 * Enforces: "Only @gmail.com users are allowed to authenticate via Google login."
 */
export const GoogleLoginButton = ({ onSuccess, onError, className = '' }) => {
  const [loading, setLoading] = useState(false);
  const tokenClientRef = useRef(null);

  const clientId =
    (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim() ||
    '81337785875-53qiqqqrjfdcvbs61es654qdhfcci186.apps.googleusercontent.com';

  const executeGoogleLogin = async ({ email, name, picture, googleId, token, credential }) => {
    try {
      setLoading(true);
      const cleanEmail = (email || '').toLowerCase().trim();

      // Client-Side Check: Only allow @gmail.com
      if (cleanEmail && !cleanEmail.endsWith('@gmail.com')) {
        const errorMsg = 'Only @gmail.com users are allowed to authenticate via Google login.';
        if (onError) onError(errorMsg);
        setLoading(false);
        return;
      }

      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token || credential,
          credential,
          email: cleanEmail || undefined,
          name: name || (cleanEmail ? cleanEmail.split('@')[0] : undefined),
          picture: picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
          googleId: googleId || (cleanEmail ? 'g_' + btoa(cleanEmail).substring(0, 16) : undefined),
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (onSuccess) onSuccess(data);
      } else {
        if (onError) onError(data.message || 'Google login failed');
      }
    } catch (err) {
      if (onError) onError(err.message || 'Network error during Google authentication');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Identity Services (GIS) Token Client
  useEffect(() => {
    const initTokenClient = () => {
      if (typeof window === 'undefined' || !window.google?.accounts?.oauth2 || !clientId) return;

      try {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          prompt: 'select_account', // ⚡ Explicitly forces Google's "Choose an Account" screen
          callback: async (tokenResponse) => {
            if (tokenResponse?.error) {
              if (tokenResponse.error !== 'popup_closed_by_user') {
                if (onError) onError(tokenResponse.error_description || tokenResponse.error);
              }
              setLoading(false);
              return;
            }

            if (tokenResponse?.access_token) {
              try {
                setLoading(true);
                // Fetch authenticated user details from Google userinfo API
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });

                if (!userInfoRes.ok) {
                  throw new Error('Failed to retrieve user info from Google.');
                }

                const profile = await userInfoRes.json();

                if (!profile.email) {
                  throw new Error('No email found in Google account profile.');
                }

                if (!profile.email.toLowerCase().endsWith('@gmail.com')) {
                  if (onError) onError('Only @gmail.com users are allowed to authenticate via Google login.');
                  setLoading(false);
                  return;
                }

                await executeGoogleLogin({
                  email: profile.email,
                  name: profile.name,
                  picture: profile.picture,
                  googleId: profile.sub,
                  token: tokenResponse.access_token,
                });
              } catch (fetchErr) {
                console.error('Google profile fetch error:', fetchErr);
                if (onError) onError(fetchErr.message || 'Failed to retrieve Google profile.');
                setLoading(false);
              }
            }
          },
          error_callback: (err) => {
            console.warn('Google Token Client error:', err);
            if (onError) onError(err.message || 'Google OAuth failed.');
            setLoading(false);
          },
        });
      } catch (e) {
        console.warn('Google OAuth Token Client init notice:', e);
      }
    };

    if (window.google?.accounts?.oauth2) {
      initTokenClient();
    } else {
      const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (script) {
        script.addEventListener('load', initTokenClient);
        return () => script.removeEventListener('load', initTokenClient);
      } else {
        const newScript = document.createElement('script');
        newScript.src = 'https://accounts.google.com/gsi/client';
        newScript.async = true;
        newScript.defer = true;
        newScript.onload = initTokenClient;
        document.head.appendChild(newScript);
      }
    }
  }, [clientId]);

  const handleButtonClick = () => {
    setLoading(true);

    // 1. If Google Token Client is ready, launch the native "Choose an Account" dialog
    if (tokenClientRef.current) {
      try {
        tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('Token client request failed, using popup fallback:', err);
      }
    }

    // 2. Direct Popup Fallback with Google Account Chooser
    const width = 520;
    const height = 630;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const redirectUri = window.location.origin;
    const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent('openid email profile')}&prompt=select_account`;

    const popup = window.open(
      googleOAuthUrl,
      'GoogleOAuthPopup',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    if (!popup) {
      if (onError) onError('Popup was blocked by browser. Please allow popups for localhost.');
      setLoading(false);
    } else {
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setLoading(false);
        }
      }, 1000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleButtonClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 bg-white hover:bg-slate-50 active:scale-[0.99] rounded-2xl transition-all text-xs sm:text-sm font-semibold text-gray-700 shadow-xs hover:shadow-md disabled:opacity-50 cursor-pointer ${className}`}
    >
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.26-2.09 3.67-5.17 3.67-9.15z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.25v3.15C3.25 21.36 7.34 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.25C.45 8.22 0 10.06 0 12s.45 3.78 1.25 5.39l4.02-3.15z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.25 6.61l4.02 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
        />
      </svg>
      <span>{loading ? 'Opening Google Account Selection...' : 'Continue with Google'}</span>
    </button>
  );
};

export default GoogleLoginButton;
