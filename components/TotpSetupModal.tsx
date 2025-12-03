import React, { useState, useRef } from 'react';
import { X, Key, Scan, Eye, EyeOff, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';

interface TotpSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (secret: string) => void;
  currentSecret?: string;
}

const TotpSetupModal: React.FC<TotpSetupModalProps> = ({ isOpen, onClose, onSave, currentSecret }) => {
  const [mode, setMode] = useState<'manual' | 'scan'>('manual');
  const [secret, setSecret] = useState(currentSecret || '');
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTotpSecret = (data: string): string | null => {
    try {
      const url = new URL(data);
      if (url.protocol === 'otpauth:') {
        const secret = url.searchParams.get('secret');
        if (secret) return secret.replace(/\s/g, '').toUpperCase();
      }
    } catch {
      const cleaned = data.replace(/\s/g, '').toUpperCase();
      if (/^[A-Z2-7]+$/.test(cleaned)) return cleaned;
    }
    return null;
  };

  if (!isOpen) return null;

  const handleSave = () => {
    const cleaned = secret.replace(/\s/g, '').toUpperCase();
    if (!cleaned) {
      setError('Please enter a TOTP secret');
      return;
    }
    if (!/^[A-Z2-7]+$/.test(cleaned)) {
      setError('Invalid Base32 secret format');
      return;
    }
    onSave(cleaned);
    onClose();
  };

  const handleQrScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code) {
            const extractedSecret = extractTotpSecret(code.data);
            if (extractedSecret) {
              setSecret(extractedSecret);
              setMode('manual');
              setError('');
            } else {
              setError('Could not extract TOTP secret from QR code');
            }
          } else {
            setError('No QR code found in image');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-5 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Key size={20} className="text-primary-500" /> Setup 2FA (TOTP)
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-white" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <button 
              onClick={() => setMode('manual')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${mode === 'manual' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              <Key size={14} className="inline mr-1.5" /> Enter Key
            </button>
            <button 
              onClick={() => { setMode('scan'); setError(''); }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${mode === 'scan' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              <Scan size={14} className="inline mr-1.5" /> Scan QR
            </button>
          </div>

          {mode === 'manual' ? (
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">TOTP Secret Key</label>
              <div className="relative">
                <input 
                  type={showSecret ? "text" : "password"}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 pr-10 text-white font-mono text-sm focus:border-primary-500 outline-none"
                  value={secret}
                  onChange={(e) => { setSecret(e.target.value); setError(''); }}
                  placeholder="JBSWY3DPEHPK3PXP"
                  autoFocus
                />
                <button 
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showSecret ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
              <p className="text-xs text-gray-500">Enter the secret key from your authenticator app</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-56 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-900/50 transition-all bg-gray-950 group"
              >
                <div className="w-16 h-16 rounded-full bg-primary-900/20 flex items-center justify-center mb-3 group-hover:bg-primary-900/30 transition-colors">
                  <Scan size={32} className="text-primary-400" />
                </div>
                <p className="text-sm text-gray-300 font-medium">Scan or Upload QR Code</p>
                <p className="text-xs text-gray-500 mt-1">Use camera or select from gallery</p>
              </div>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleQrScan}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-900/30 rounded-lg text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-800 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors"
          >
            Save TOTP
          </button>
        </div>
      </div>
    </div>
  );
};

export default TotpSetupModal;
