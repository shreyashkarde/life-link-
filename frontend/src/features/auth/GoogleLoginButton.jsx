import React, { useState } from 'react';

/**
 * 🔑 GoogleLoginButton.jsx
 * Modular, plug-and-play Google Sign-in button.
 */
export const GoogleLoginButton = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);

  const handleSimulatedGoogleLogin = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ashutosh.google@demo.com',
          name: 'Ashutosh Demo (Google)',
          picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
        }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        if (onSuccess) onSuccess(data);
      } else {
        if (onError) onError(data.message);
      }
    } catch (err) {
      if (onError) onError('Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSimulatedGoogleLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm disabled:opacity-50"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
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
      {loading ? 'Authenticating...' : 'Continue with Google'}
    </button>
  );
};

export default GoogleLoginButton;
