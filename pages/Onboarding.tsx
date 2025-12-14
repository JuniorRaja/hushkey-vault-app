import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Confetti from "react-confetti";
import {
  User,
  KeyRound,
  ScanFace,
  Sparkles,
  ArrowRight,
  Delete,
  Loader2,
  Check,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "../src/stores/authStore";
import { BiometricService } from "../src/services/biometric";
import DatabaseService from "../src/services/database";
import EncryptionService from "../src/services/encryption";
import IndexedDBService from "../src/services/indexedDB";
import { supabase } from "../src/supabaseClient";

const HushkeyLogo = ({ size = 24 }: { size?: number }) => (
  <img src="/hushkey-icon.png" alt="Hushkey" width={size} height={size} />
);

const TOTAL_STEPS = 4; // Welcome, PIN, Biometric, Complete

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    onboardingStep,
    setOnboardingStep,
    setupMasterPinForOnboarding,
  } = useAuthStore();

  // Step states
  const [name, setName] = useState(user?.name || "");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const step = onboardingStep ?? 0;

  // Check biometric availability and fetch OAuth name on mount
  useEffect(() => {
    const initialize = async () => {
      // Check biometric
      const available = await BiometricService.isAvailable();
      setBiometricAvailable(available);
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });

      // Try to fetch name from OAuth session if not already set
      if (!name && !user?.name) {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user?.user_metadata) {
            const oauthName =
              session.user.user_metadata.full_name ||
              session.user.user_metadata.name ||
              session.user.user_metadata.preferred_username ||
              "";
            if (oauthName) {
              setName(oauthName);
            }
          }
        } catch (e) {
          console.warn("Failed to fetch OAuth name", e);
        }
      }
    };
    initialize();
  }, []);

  // Helper to calculate dynamic total steps (skip biometric if not available)
  const getDynamicTotalSteps = () => (biometricAvailable ? 4 : 3);

  // Map logical step to display step index for progress
  const getProgressStep = () => {
    if (!biometricAvailable && step >= 2) {
      return step === 2 ? 2 : step; // Step 2 becomes complete, 3 doesn't exist
    }
    return step;
  };

  const handleNameContinue = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      // Create/update profile with name
      if (user) {
        // Check if profile exists, if not create it
        let profile = await DatabaseService.getUserProfile(user.id);
        if (!profile) {
          const salt = EncryptionService.generateSalt();
          await DatabaseService.createUserProfile(user.id, salt);
          await IndexedDBService.saveUserProfile(user.id, salt);

          const defaultSettings = {
            auto_lock_minutes: 5,
            clipboard_clear_seconds: 30,
            theme: "dark",
            allow_screenshots: false,
          };
          await DatabaseService.saveUserSettings(user.id, defaultSettings);
          await IndexedDBService.saveSettings(user.id, defaultSettings);

          const deviceId = EncryptionService.generateRandomString();
          const deviceName = navigator.userAgent.substring(0, 50);
          await DatabaseService.saveDevice(user.id, deviceId, deviceName);
          await IndexedDBService.saveDevice(user.id, deviceId, deviceName);
        }

        // Update user profile with name (store only, actual name save to DB needs masterKey)
        useAuthStore.getState().updateUserProfile({ name: name.trim() });
      }

      setOnboardingStep(1);
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberClick = (num: string) => {
    if (isLoading) return;
    setError("");

    if (!isConfirming && pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 6) {
        setIsConfirming(true);
      }
    } else if (isConfirming && confirmPin.length < 6) {
      const newConfirm = confirmPin + num;
      setConfirmPin(newConfirm);
      if (newConfirm.length === 6) {
        setTimeout(() => handlePinSubmit(pin, newConfirm), 100);
      }
    }
  };

  const handleDelete = () => {
    if (isConfirming && confirmPin.length > 0) {
      setConfirmPin((prev) => prev.slice(0, -1));
    } else if (pin.length > 0) {
      setPin((prev) => prev.slice(0, -1));
      if (isConfirming && confirmPin.length === 0) {
        setIsConfirming(false);
      }
    }
    setError("");
  };

  const handlePinSubmit = async (masterPin: string, confirm: string) => {
    if (masterPin !== confirm) {
      setError("PINs do not match. Try again.");
      setPin("");
      setConfirmPin("");
      setIsConfirming(false);
      return;
    }

    setIsLoading(true);
    try {
      await setupMasterPinForOnboarding(masterPin);

      // Move to biometric step or complete
      if (biometricAvailable) {
        setOnboardingStep(2);
      } else {
        setOnboardingStep(3); // Skip to complete
      }
    } catch (err: any) {
      setError(err.message || "Failed to set PIN");
      setPin("");
      setConfirmPin("");
      setIsConfirming(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableBiometrics = async () => {
    setIsLoading(true);
    setError("");
    try {
      if (user) {
        // Register biometric credential
        await BiometricService.register(user.id);

        // Update settings in DB
        await DatabaseService.saveUserSettings(user.id, {
          biometric_enabled: true,
        });
        await IndexedDBService.saveSettings(user.id, {
          biometric_enabled: true,
        });
        useAuthStore.setState({ biometricEnabled: true });
      }
      setOnboardingStep(3);
    } catch (err: any) {
      setError(err.message || "Failed to enable biometrics");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipBiometrics = () => {
    setOnboardingStep(3);
  };

  const handleComplete = () => {
    // Mark vault as unlocked now that onboarding is complete
    useAuthStore.setState({ isUnlocked: true });
    setOnboardingStep(null); // Clear onboarding
    navigate("/vaults", { replace: true });
  };

  const currentPin = isConfirming ? confirmPin : pin;

  // --- RENDERS ---

  const renderProgressBar = () => {
    const totalSteps = getDynamicTotalSteps();
    const currentStep = getProgressStep();
    const progress = ((currentStep + 1) / totalSteps) * 100;

    return (
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  // Step 0: Welcome / Name
  const renderNameStep = () => (
    <div className="flex flex-col items-center text-center animate-fade-in">
      <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-900/50 mb-6">
        <User size={40} className="text-white" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Welcome to Hushkey</h1>
      <p className="text-gray-400 mb-8">
        Let's personalize your vault experience
      </p>

      <div className="w-full max-w-xs space-y-4">
        <div>
          <label className="block text-left text-sm text-gray-400 mb-2">
            What should we call you?
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-500 border border-gray-700 focus:border-primary-500 focus:outline-none text-center text-lg"
            autoFocus
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleNameContinue}
          disabled={isLoading || !name.trim()}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              Continue
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Step 1: Set PIN
  const renderPinStep = () => (
    <div className="flex flex-col items-center text-center animate-fade-in">
      <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-900/50 mb-6">
        <KeyRound size={40} className="text-white" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">
        {isConfirming ? "Confirm Your PIN" : "Create Master PIN"}
      </h1>
      <p className="text-gray-400 mb-2">
        {isConfirming
          ? "Re-enter your 6-digit PIN"
          : "Choose a 6-digit PIN to secure your vault"}
      </p>

      {!isConfirming && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6 max-w-xs">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
          <p className="text-amber-300 text-xs text-left">
            <strong>Important:</strong> This PIN encrypts your vault. If lost,
            your data cannot be recovered!
          </p>
        </div>
      )}

      {/* PIN Dots */}
      <div
        className={`h-8 mb-6 flex items-center justify-center transition-all ${
          error ? "animate-shake" : ""
        }`}
      >
        <div className="flex gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i < currentPin.length
                  ? error
                    ? "bg-red-500 w-3 h-3 scale-110"
                    : "bg-primary-500 w-3 h-3 scale-110"
                  : "bg-gray-700 w-3 h-3"
              }`}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-xs px-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            disabled={isLoading}
            className="w-16 h-16 rounded-full bg-gray-900/50 hover:bg-gray-800 border border-gray-800 text-2xl font-medium text-white transition-all active:scale-95 flex items-center justify-center mx-auto disabled:opacity-50"
          >
            {num}
          </button>
        ))}
        <div className="col-span-1" />
        <button
          onClick={() => handleNumberClick("0")}
          disabled={isLoading}
          className="w-16 h-16 rounded-full bg-gray-900/50 hover:bg-gray-800 border border-gray-800 text-2xl font-medium text-white transition-all active:scale-95 flex items-center justify-center mx-auto disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="w-16 h-16 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all active:scale-95 flex items-center justify-center mx-auto disabled:opacity-50"
        >
          <Delete size={24} />
        </button>
      </div>
    </div>
  );

  // Step 2: Biometrics
  const renderBiometricStep = () => (
    <div className="flex flex-col items-center text-center animate-fade-in">
      <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-900/50 mb-6">
        <ScanFace size={40} className="text-white" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Enable Biometrics?</h1>
      <p className="text-gray-400 mb-8 max-w-xs">
        Unlock your vault faster with fingerprint or face recognition
      </p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleEnableBiometrics}
          disabled={isLoading}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <ScanFace size={20} />
              Enable Biometrics
            </>
          )}
        </button>
        <button
          onClick={handleSkipBiometrics}
          disabled={isLoading}
          className="w-full py-3 text-gray-400 hover:text-white font-medium transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );

  // Step 3: Complete
  const renderCompleteStep = () => (
    <div className="flex flex-col items-center text-center animate-fade-in relative">
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={200}
        gravity={0.15}
      />

      <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-900/50 mb-6 animate-bounce-slow">
        <Check size={48} className="text-white" strokeWidth={3} />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">You're All Set!</h1>
      <p className="text-gray-400 mb-8 max-w-xs">
        Your vault is ready. Start storing your passwords securely.
      </p>

      <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-8 max-w-xs">
        <ShieldCheck className="text-green-400 shrink-0" size={24} />
        <p className="text-green-300 text-sm text-left">
          Your data is end-to-end encrypted and only accessible with your PIN.
        </p>
      </div>

      <button
        onClick={handleComplete}
        className="w-full max-w-xs py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
      >
        <Sparkles size={20} />
        Go to My Vault
      </button>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return renderNameStep();
      case 1:
        return renderPinStep();
      case 2:
        return biometricAvailable
          ? renderBiometricStep()
          : renderCompleteStep();
      case 3:
        return renderCompleteStep();
      default:
        return renderNameStep();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {renderProgressBar()}

      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {renderStep()}
      </div>
    </div>
  );
};

export default Onboarding;
