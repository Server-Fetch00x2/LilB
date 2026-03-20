import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function PinLock() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { verifyPin, logout } = useAuth();

  const handleKey = async (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      try {
        await verifyPin(newPin);
      } catch (err) {
        setError('Wrong PIN. Try again.');
        setTimeout(() => setPin(''), 400);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="pin-overlay">
      <div className="pin-card">
        <h2>🔒 Enter PIN</h2>
        <p>Enter your 4-digit PIN to unlock</p>
        
        <div className="pin-dots">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>
        
        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, '⌫'].map((key, i) => {
            if (key === null) return <div key={i} />;
            if (key === '⌫') return (
              <button key={i} className="pin-key backspace" onClick={handleBackspace}>⌫</button>
            );
            return (
              <button key={i} className="pin-key" onClick={() => handleKey(String(key))}>{key}</button>
            );
          })}
        </div>
        
        {error && <p className="pin-error">{error}</p>}
        
        <button
          className="btn btn-ghost mt-lg"
          onClick={logout}
          style={{ width: '100%', marginTop: '24px' }}
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
