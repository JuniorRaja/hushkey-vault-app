import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Github, Mail, Loader2, Delete, ScanFace, LogOut } from "lucide-react";
import { useAuthStore } from "../src/stores/authStore";
import { BiometricService } from "../src/services/biometric";

const HushkeyLogo = ({ size = 24 }: { size?: number }) => (
  <img src="/hushkey-icon.png" alt="Hushkey" width={size} height={size} />
);

/**
 * Login Component - Handles ONLY:
 * 1. Sign in / Sign up with email/password
 * 2. OAuth sign in (Google/GitHub)
 * 3. PIN unlock for returning users (when hasPinSet is true)
 *
 * Onboarding detection happens in App.tsx routing, NOT here.
 */
const Login: React.FC = () => {
  const navigate = useNavigate();

  const {
    user,
    isUnlocked,
    hasPinSet,
    biometricEnabled: biometricEnabledStore,
    signIn,
    signUp,
    signInWithOAuth,
    unlockWithPin,
    unlockWithBiometrics,
    checkNewDevice,
  } = useAuthStore();

  // UI State
  const [mode, setMode] = useState<"signin" | "signup" | "unlock">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null
  );

  // Determine mode based on user state - SIMPLE LOGIC
  useEffect(() => {
    // If user exists and has PIN set, show unlock screen
    if (user && hasPinSet && !isUnlocked) {
      setMode("unlock");
      // Check biometric availability
      BiometricService.isAvailable().then(setBiometricAvailable);
    }
    // If user exists and is unlocked, navigate away
    else if (user && isUnlocked) {
      navigate("/vaults", { replace: true });
    }
    // Otherwise stay on signin
  }, [user?.id, hasPinSet, isUnlocked, navigate]);

  const handleSuccess = async () => {
    await checkNewDevice();
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

  const handleOAuth = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider);
    } catch (err: any) {
      setError(err.message || "OAuth failed");
      setOauthLoading(null);
    }
  };

  const handleNumberClick = (num: string) => {
    if (isLoading || pin.length >= 6) return;
    setError("");
    const newPin = pin + num;
    setPin(newPin);
    if (newPin.length === 6) {
      attemptUnlock(newPin);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const attemptUnlock = async (inputPin: string) => {
    setIsVerifying(true);
    setIsLoading(true);
    try {
      await unlockWithPin(inputPin);
      await handleSuccess();
    } catch (err: any) {
      setError("Incorrect PIN");
      setTimeout(() => setPin(""), 300);
    } finally {
      setIsLoading(false);
      setIsVerifying(false);
    }
  };

  const attemptBiometricUnlock = async () => {
    setIsLoading(true);
    try {
      await unlockWithBiometrics();
      await handleSuccess();
    } catch (err: any) {
      setError("Biometric failed. Use PIN.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    useAuthStore.getState().signOut();
    setMode("signin");
    setPin("");
    setError("");
  };

  // ========== UNLOCK SCREEN ==========
  if (mode === "unlock") {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-[128px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-900/50 mb-6">
              <HushkeyLogo size={50} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Hushkey Vault
            </h1>
            <p
              className={`h-6 ${
                error ? "text-red-400 animate-shake" : "text-gray-400"
              }`}
            >
              {error || "Enter your PIN to unlock"}
            </p>
          </div>

          {/* PIN Dots */}
          <div
            className={`h-8 mb-8 flex items-center justify-center ${
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
                    className={`rounded-full transition-all duration-200 ${
                      i < pin.length
                        ? error
                          ? "bg-red-500 w-3 h-3"
                          : "bg-primary-500 w-3 h-3"
                        : "bg-gray-800 w-3 h-3"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Number Pad */}
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

            {biometricEnabledStore && biometricAvailable ? (
              <button
                onClick={attemptBiometricUnlock}
                disabled={isLoading}
                className="w-16 h-16 rounded-full bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/30 text-primary-400 transition-all active:scale-95 flex items-center justify-center mx-auto disabled:opacity-50"
              >
                <ScanFace size={24} />
              </button>
            ) : (
              <div />
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

          <button
            onClick={handleSignOut}
            className="mt-8 text-sm text-gray-500 hover:text-white font-medium transition-colors flex items-center gap-2"
          >
            <LogOut size={14} />
            Switch Accounts
          </button>
        </div>
      </div>
    );
  }

  // ========== SIGN IN / SIGN UP SCREEN ==========
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
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
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="animate-spin" size={20} />}
            {mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <div className="w-full mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
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
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
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
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
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

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
};

export default Login;
