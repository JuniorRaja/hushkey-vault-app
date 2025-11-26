
import React, { useState, useEffect } from 'react';
import { useAuth, useData } from '../App';
import { useNavigate, useLocation } from 'react-router-dom';
import { Delete, ScanFace, Loader2 } from 'lucide-react';
import { NotificationType } from '../types';

const HushkeyLogo = ({ size = 24 }: { size?: number }) => (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
            <path d="M20 20V80" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
            <path d="M80 20V80" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
            <path d="M20 50H80" stroke="currentColor" strokeWidth="12" strokeLinecap="round"/>
            <path d="M45 50L65 30" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.8"/>
            <path d="M65 30L75 40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.8"/>
            <circle cx="40" cy="50" r="8" fill="currentColor" />
        </svg>
    </div>
);

const Login: React.FC = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  
  const { login, loginWithBiometrics, isAuthenticated } = useAuth();
  const { settings, triggerNotification } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/vaults';

  // Auto-scan on mount if biometric is enabled
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    } else if (settings.unlockMethod === 'biometric' && !isBiometricScanning) {
       handleBiometricAuth();
    }
  }, [isAuthenticated, navigate, from, settings.unlockMethod]);

  const handleSuccess = () => {
      // Check for new device logic
      const deviceId = localStorage.getItem('sentinel_device_id');
      if (!deviceId) {
          localStorage.setItem('sentinel_device_id', crypto.randomUUID());
          triggerNotification(
              "New Device Login",
              "A login was detected from a new device. If this wasn't you, verify your security settings.",
              NotificationType.SECURITY,
              'newDeviceLogin'
          );
      }
      navigate(from, { replace: true });
  }

  const handleBiometricAuth = async () => {
      setIsBiometricScanning(true);
      setError(false);
      const success = await loginWithBiometrics();
      if (success) {
          handleSuccess();
      } else {
          setIsBiometricScanning(false);
      }
  };

  const handleNumberClick = (num: string) => {
    if (isBiometricScanning) return;
    
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      if (newPin.length === 4) {
        // Auto submit on 4th digit
        setTimeout(() => attemptLogin(newPin), 100);
      }
    }
  };

  const attemptLogin = (inputPin: string) => {
    const success = login(inputPin);
    if (success) {
      handleSuccess();
    } else {
      setError(true);
      // Trigger Notification for failure
      triggerNotification(
          "Failed Login Attempt",
          "An incorrect PIN was entered. Check logs if this persists.",
          NotificationType.SECURITY,
          'failedLoginAttempts'
      );
      setTimeout(() => setPin(''), 500);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-[128px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-900/50 mb-6">
            <HushkeyLogo size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Hushkey</h1>
          <p className="text-gray-400">
              {isBiometricScanning ? 'Verifying Identity...' : 'Enter your PIN to unlock vault'}
          </p>
        </div>

        {/* PIN Dots or Biometric Spinner */}
        <div className="h-8 mb-8 flex items-center justify-center">
            {isBiometricScanning ? (
                <div className="flex items-center gap-2 text-primary-400">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm font-medium">Scanning Face ID</span>
                </div>
            ) : (
                <div className="flex gap-4">
                {[0, 1, 2, 3].map((i) => (
                    <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        i < pin.length
                        ? error ? 'bg-red-500 scale-110' : 'bg-primary-500 scale-110'
                        : 'bg-gray-800'
                    }`}
                    />
                ))}
                </div>
            )}
        </div>
        
        {error && !isBiometricScanning && <p className="text-red-500 text-sm mb-4 animate-bounce">Incorrect PIN. Try 1234.</p>}

        {/* Numpad */}
        <div className={`grid grid-cols-3 gap-6 w-full px-4 transition-opacity duration-300 ${isBiometricScanning ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className="w-16 h-16 rounded-full bg-gray-900/50 hover:bg-gray-800 border border-gray-800 text-2xl font-medium text-white transition-all active:scale-95 flex items-center justify-center mx-auto"
            >
              {num}
            </button>
          ))}
          
          {/* Bottom Row */}
          <div className="col-span-1 flex items-center justify-center">
               {settings.unlockMethod === 'biometric' && !isBiometricScanning && (
                   <button 
                    onClick={handleBiometricAuth}
                    className="w-16 h-16 rounded-full text-primary-400 hover:text-primary-300 hover:bg-primary-900/20 transition-all active:scale-95 flex items-center justify-center mx-auto"
                   >
                       <ScanFace size={28} />
                   </button>
               )}
          </div> 
          <button
              onClick={() => handleNumberClick('0')}
              className="w-16 h-16 rounded-full bg-gray-900/50 hover:bg-gray-800 border border-gray-800 text-2xl font-medium text-white transition-all active:scale-95 flex items-center justify-center mx-auto"
            >
              0
            </button>
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all active:scale-95 flex items-center justify-center mx-auto"
          >
            <Delete size={24} />
          </button>
        </div>

        {!isBiometricScanning && (
            <button className="mt-12 text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors">
            Forgot PIN?
            </button>
        )}
      </div>
    </div>
  );
};

export default Login;
