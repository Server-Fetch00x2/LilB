import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const THEMES = [
  { id: 'sakura', label: 'Sakura', emoji: '🌸' },
  { id: 'lavender', label: 'Lavender', emoji: '💜' },
  { id: 'ocean', label: 'Ocean', emoji: '🌊' },
  { id: 'mint', label: 'Mint', emoji: '🌿' },
];

export default function SettingsPage() {
  const { hasPin, setPin, removePin, authFetch } = useAuth();
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('lb_theme') || 'sakura');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('lb_mode') === 'dark');
  const [pinInput, setPinInput] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwMsg, setPwMsg] = useState('');


  const handleSetPin = async () => {
    if (!/^\d{4}$/.test(pinInput)) {
      setPinMsg('PIN must be exactly 4 digits.');
      return;
    }
    try {
      await setPin(pinInput);
      setPinMsg('PIN set successfully! 🎉');
      setPinInput('');
    } catch (err) {
      setPinMsg(err.message);
    }
  };

  const handleRemovePin = async () => {
    try {
      await removePin();
      setPinMsg('PIN removed.');
    } catch (err) {
      setPinMsg(err.message);
    }
  };

  const handleChangePassword = async () => {
    if (!pwCurrent || !pwNew) {
      setPwMsg('Both fields are required.');
      return;
    }
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwMsg('Password changed! 🎉');
      setPwCurrent('');
      setPwNew('');
    } catch (err) {
      setPwMsg(err.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Settings ⚙️</h2>
      </div>
      <div className="page-content">
        <div className="settings-grid">

          {/* Theme Removed */}

          {/* PIN Lock */}
          <div className="settings-section">
            <h3>🔒 PIN Lock</h3>
            {hasPin ? (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  ✅ PIN lock is enabled. Your diary is extra safe!
                </p>
                <button className="btn btn-danger" onClick={handleRemovePin}
                  style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
                  Remove PIN
                </button>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Add a 4-digit PIN for extra security
                </p>
                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="4-digit PIN"
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    style={{
                      padding: '10px 14px', border: '2px solid var(--border)',
                      borderRadius: 'var(--radius-md)', background: 'var(--bg-input)',
                      color: 'var(--text-primary)', fontSize: '1.1rem', width: '120px',
                      textAlign: 'center', letterSpacing: '6px'
                    }}
                  />
                  <button className="btn btn-primary" onClick={handleSetPin}
                    style={{ padding: '10px 20px', width: 'auto', fontSize: '0.85rem' }}>
                    Set PIN
                  </button>
                </div>
              </>
            )}
            {pinMsg && <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--primary-dark)' }}>{pinMsg}</p>}
          </div>

          {/* Change Password */}
          <div className="settings-section">
            <h3>🔑 Change Password</h3>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                placeholder="Current password"
                value={pwCurrent}
                onChange={e => setPwCurrent(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                placeholder="New password (min 6 chars)"
                value={pwNew}
                onChange={e => setPwNew(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={handleChangePassword}
              style={{ padding: '10px 20px', width: 'auto', fontSize: '0.85rem' }}>
              Update Password
            </button>
            {pwMsg && <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--primary-dark)' }}>{pwMsg}</p>}
          </div>

          {/* About */}
          <div className="settings-section">
            <h3>💖 About LittleBabli</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.7' }}>
              LittleBabli is your personal, private diary. Write your thoughts, 
              capture memories, track your moods, and keep everything safe and beautiful. 🌸
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '12px' }}>
              Made with 💖 • v1.0.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
