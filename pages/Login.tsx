import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Github, Mail, Loader2, Delete, ScanFace, LogOut } from "lucide-react";
import { useAuthStore } from "../src/stores/authStore";
import { BiometricService } from "../src/services/biometric";
import DatabaseService from "../src/services/database";

const HushkeyLogo = ({ size = 24 }: { size?: number }) => (
  <img src="/hushkey-icon.png" alt="Hushkey" width={size} height={size} />
);

const Login: React.FC = () => {
  const [mode, setMode] = useState<"signin" | "signup" | "setpin" | "unlock">(
    "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showBiometricError, setShowBiometricError] = useState(false);

  const {
    user,
    isUnlocked,
    hasPinSet,
    biometricEnabled: biometricEnabledStore,
    failedAttempts,
    signIn,
    signUp,
    signInWithOAuth,
    setupMasterPin,
    unlockWithPin,
    unlockWithBiometrics,
    checkNewDevice,
    setHasPinSet,
  } = useAuthStore();

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkPinStatus = async () => {
      if (user && !isUnlocked) {
        // Use cached hasPinSet from localStorage first
        if (!hasPinSet) {
          // Double-check with server for new users
          try {
            const profile = await DatabaseService.getUserProfile(user.id);
            if (!profile?.pin_verification) {
              if (mounted) setMode("setpin");
              return;
            } else {
              // Found pin on server, update store
              setHasPinSet(true);
            }
          } catch (e) {
            console.error("Failed to check profile", e);
            // Fallback to generic unlock screen or remain on loading?
            // If offline and no cache, we might be stuck.
            // But if offline, hasPinSet should be true if they ever logged in before.
          }
        }

        // PIN is set, show unlock screen
        if (mounted) setMode("unlock");

        // Check biometric availability
        const available = await BiometricService.isAvailable();
        if (mounted) setBiometricAvailable(available);

        if (available) {
          // Use cached biometricEnabled from localStorage first
          let enabled = biometricEnabledStore;

          // If not cached or on new device, fetch from server
          if (!enabled && navigator.onLine) {
            try {
              const settings = await DatabaseService.getUserSettings(user.id);
              enabled = settings?.biometric_enabled || false;
            } catch (e) {
              console.warn("Using default biometric setting");
            }
          }

          if (mounted) setBiometricEnabled(enabled);

          // Auto-trigger if enabled
          // if (enabled && mounted) {
          //   setTimeout(() => {
          //     if (mounted) attemptBiometricUnlock().catch(() => {});
          //   }, 500);
          // }
        }
      } else if (user && isUnlocked) {
        navigate("/vaults", { replace: true });
      }
    };

    checkPinStatus();

    return () => {
      mounted = false;
    };
  }, [user?.id, isUnlocked, hasPinSet, biometricEnabledStore]);

  const handleSuccess = async () => {
    const isNewDevice = await checkNewDevice();
    if (isNewDevice) {
      console.log("New device detected");
    }
    navigate("/vaults", { replace: true });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else if (mode === "signup") {
        await signUp(email, password);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberClick = (num: string) => {
    if (isLoading) return;

    if (mode === "setpin") {
      if (!isSettingPin && pin.length < 6) {
        const newPin = pin + num;
        setPin(newPin);
        if (newPin.length === 6) {
          setIsSettingPin(true);
        }
      } else if (isSettingPin && confirmPin.length < 6) {
        const newConfirm = confirmPin + num;
        setConfirmPin(newConfirm);
        if (newConfirm.length === 6) {
          setTimeout(() => attemptSetPin(pin, newConfirm), 100);
        }
      }
    } else if (mode === "unlock") {
      if (pin.length < 6) {
        const newPin = pin + num;
        setPin(newPin);
        setError("");
        if (newPin.length === 6) {
          setTimeout(() => attemptUnlock(newPin), 100);
        }
      }
    }
  };

  const attemptSetPin = async (masterPin: string, confirm: string) => {
    if (masterPin !== confirm) {
      setError("PINs do not match");
      setPin("");
      setConfirmPin("");
      setIsSettingPin(false);
      return;
    }

    setIsLoading(true);
    try {
      await setupMasterPin(masterPin);
      await handleSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to set PIN");
      setPin("");
      setConfirmPin("");
      setIsSettingPin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const attemptUnlock = async (inputPin: string) => {
    setIsVerifying(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsLoading(true);
    try {
      await unlockWithPin(inputPin);
      await handleSuccess();
    } catch (err: any) {
      setError("Incorrect PIN");
      setTimeout(() => setPin(""), 500);
    } finally {
      setIsLoading(false);
      setIsVerifying(false);
    }
  };

  const attemptBiometricUnlock = async () => {
    setIsLoading(true);
    setShowBiometricError(false);
    try {
      await unlockWithBiometrics();
      await handleSuccess();
    } catch (err: any) {
      setShowBiometricError(true);
      setError("Biometric authentication failed. Use PIN to unlock.");
      setTimeout(() => setShowBiometricError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (mode === "setpin") {
      if (isSettingPin && confirmPin.length > 0) {
        setConfirmPin((prev) => prev.slice(0, -1));
      } else if (pin.length > 0) {
        setPin((prev) => prev.slice(0, -1));
      }
    } else if (mode === "unlock") {
      setPin((prev) => prev.slice(0, -1));
    }
    setError("");
  };

  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  const handleOAuth = async (provider: "google" | "github") => {
    console.log("[Login] OAuth button clicked:", provider);
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider);
      console.log("[Login] OAuth redirect initiated");
    } catch (err: any) {
      console.error("[Login] OAuth error:", err);
      setError(err.message || "OAuth failed");
      setOauthLoading(null);
    }
  };

  if (mode === "setpin" || mode === "unlock") {
    const currentPin =
      mode === "setpin" ? (isSettingPin ? confirmPin : pin) : pin;
    const pinLength = mode === "setpin" ? 6 : 6;

    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-[128px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-900/50 mb-6">
              <HushkeyLogo size={50} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Hushkey Vault
            </h1>
            <p
              className={`transition-colors duration-300 h-6 ${
                error
                  ? "text-red-400 font-medium animate-shake"
                  : "text-gray-400"
              }`}
            >
              {error
                ? error
                : mode === "setpin"
                ? isSettingPin
                  ? "Confirm your 6-digit PIN"
                  : "Set your 6-digit Master PIN"
                : "Enter your PIN to unlock vault"}
            </p>
          </div>

          <div
            className={`h-8 mb-8 flex items-center justify-center transition-all ${
              error ? "animate-shake" : ""
            }`}
          >
            {isVerifying ? (
              <Loader2 className="animate-spin text-primary-500" size={24} />
            ) : (
              <div className="flex gap-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i < currentPin.length
                        ? error
                          ? "bg-red-500 w-3 h-3 scale-110"
                          : currentPin.length === 6
                          ? "bg-primary-500 w-2 h-2"
                          : "bg-primary-500 w-3 h-3 scale-110"
                        : "bg-gray-800 w-3 h-3"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-6 w-full px-4">
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

            {mode === "unlock" && biometricEnabled && biometricAvailable ? (
              <button
                onClick={attemptBiometricUnlock}
                disabled={isLoading}
                className="w-16 h-16 rounded-full bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/30 text-primary-400 transition-all active:scale-95 flex items-center justify-center mx-auto disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <ScanFace size={24} />
                )}
              </button>
            ) : (
              <div className="col-span-1" />
            )}
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

          <div className="mt-8 space-y-4 w-full px-4 text-center">
            <button
              onClick={() => {
                useAuthStore.getState().signOut();
                setMode("signin");
              }}
              className="text-sm text-gray-500 hover:text-white font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <LogOut size={14} />
              Switch Accounts
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center animate-fade-in">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-900/50 mb-6">
            <HushkeyLogo size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Hushkey Vault</h1>
          <p className="text-gray-400">
            {mode === "signup" ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="w-full space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-gray-700 focus:border-primary-500 focus:outline-none"
            required
            disabled={isLoading}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-gray-700 focus:border-primary-500 focus:outline-none"
            required
            disabled={isLoading}
          />

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="animate-spin" size={20} />}
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="w-full mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-950 text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {oauthLoading === "google" ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Mail size={20} />
              )}
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("github")}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {oauthLoading === "github" ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Github size={20} />
              )}
              GitHub
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            {mode === "signin"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
