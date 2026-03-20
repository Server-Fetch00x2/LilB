import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API = '/api';
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('lb_token'));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('lb_user');
    return u ? JSON.parse(u) : null;
  });
  const [hasPin, setHasPin] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-logout on inactivity
  useEffect(() => {
    if (!token) return;
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => logout(), INACTIVITY_TIMEOUT);
    };
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [token]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('lb_token', data.token);
      localStorage.setItem('lb_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setHasPin(data.hasPin);
      setPinVerified(!data.hasPin);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('lb_token', data.token);
      localStorage.setItem('lb_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setHasPin(false);
      setPinVerified(true);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('lb_token');
    localStorage.removeItem('lb_user');
    setToken(null);
    setUser(null);
    setHasPin(false);
    setPinVerified(false);
  }, []);

  const verifyPin = async (pin) => {
    const res = await fetch(`${API}/auth/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setPinVerified(true);
    return data;
  };

  const setPin = async (pin) => {
    const res = await fetch(`${API}/auth/set-pin`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setHasPin(true);
    return data;
  };

  const removePin = async () => {
    const res = await fetch(`${API}/auth/remove-pin`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setHasPin(false);
    return data;
  };

  const checkPin = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/has-pin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setHasPin(data.hasPin);
        setPinVerified(!data.hasPin);
      } else {
        logout();
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (token) checkPin();
  }, [token]);

  const authFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please login again.');
    }
    return res;
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{
      token, user, hasPin, pinVerified, loading,
      login, register, logout, verifyPin, setPin, removePin, authFetch,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
