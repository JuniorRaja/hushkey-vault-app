import React, { useState, useEffect } from "react";
import { Mail, Lock, Delete, ScanFace, Loader2, LogOut } from "lucide-react";
import { useAuthStore } from "../src/stores/auth";
import { useOnboardingStore } from "../src/stores/onboarding";
import { BiometricService } from "../src/services/biometric";
import DatabaseService from "../src/services/database";

const HushkeyLogo = ({ size = 32 }: { size?: number }) => (
  <img src="/hushkey-icon.png" alt="HushKey" width={size} height={size} />
);

// ── Email/Password Screen ─────────────────────────────────────────────────────
const EmailScreen: React.FC = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, signUp } = useAuthStore();
  const { startOnboarding } = useOnboardingStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (mode === "signup") {
        await signUp(email, password);
        startOnboarding();
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-gray-700 focus:border-primary-500 focus:outline-none"
            required
            disabled={isLoading}
          />
        </div>
        <div className="relative">
          <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-gray-700 focus:border-primary-500 focus:outline-none"
            required
            disabled={isLoading}
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          {mode === "signin" ? "Sign In" : "Create Account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
        className="text-sm text-primary-400 hover:text-primary-300 transition-colors text-center"
      >
        {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
};

// ── PIN Unlock Screen ─────────────────────────────────────────────────────────
const PinUnlockScreen: React.FC = () => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const { user, biometricEnabled, unlockWithPin, unlockWithBiometrics, signOut } = useAuthStore();

  useEffect(() => {
    BiometricService.isAvailable().then(setBiometricAvailable);
  }, []);

  const attemptUnlock = async (inputPin: string) => {
    setIsVerifying(true);
    setIsLoading(true);
    try {
      await unlockWithPin(inputPin);
    } catch (err: any) {
      setError("Incorrect PIN");
      setTimeout(() => { setPin(""); setError(""); }, 1200);
    } finally {
      setIsLoading(false);
      setIsVerifying(false);
    }
  };

  const handleNumber = (num: string) => {
    if (isLoading || pin.length >= 6) return;
    const next = pin + num;
    setPin(next);
    setError("");
    if (next.length === 6) setTimeout(() => attemptUnlock(next), 100);
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError("");
  };

  const handleBiometric = async () => {
    setIsLoading(true);
    try {
      await unlockWithBiometrics();
    } catch {
      setError("Biometric failed. Use PIN.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className={`text-sm h-5 transition-colors ${error ? "text-red-400" : "text-gray-400"}`}>
        {error || "Enter your PIN to unlock vault"}
      </p>

      <div className={`flex gap-3 h-8 items-center ${error ? "animate-shake" : ""}`}>
        {isVerifying ? (
          <Loader2 size={22} className="animate-spin text-primary-500" />
        ) : (
          [0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i < pin.length
                  ? error
                    ? "bg-red-500 w-3 h-3"
                    : pin.length === 6
                    ? "bg-primary-500 w-2 h-2"
                    : "bg-primary-500 w-3 h-3 scale-110"
                  : "bg-gray-800 w-3 h-3"
              }`}
            />
          ))
        )}
      </div>

      <div className="grid grid-cols-3 gap-5 w-full px-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumber(num.toString())}
            disabled={isLoading}
            className="w-16 h-16 rounded-full bg-gray-900/50 hover:bg-gray-800 border border-gray-800 text-2xl font-medium text-white transition-all active:scale-95 mx-auto disabled:opacity-50"
          >
            {num}
          </button>
        ))}

        {biometricEnabled && biometricAvailable ? (
          <button
            onClick={handleBiometric}
            disabled={isLoading}
            className="w-16 h-16 rounded-full bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/30 text-primary-400 transition-all active:scale-95 mx-auto disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={22} className="animate-spin mx-auto" /> : <ScanFace size={22} className="mx-auto" />}
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={() => handleNumber("0")}
          disabled={isLoading}
          className="w-16 h-16 rounded-full bg-gray-900/50 hover:bg-gray-800 border border-gray-800 text-2xl font-medium text-white transition-all active:scale-95 mx-auto disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="w-16 h-16 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all active:scale-95 mx-auto disabled:opacity-50"
        >
          <Delete size={22} className="mx-auto" />
        </button>
      </div>

      <button
        onClick={() => signOut()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
      >
        <LogOut size={14} /> Switch Accounts
      </button>
    </div>
  );
};

// ── LoginV2 ───────────────────────────────────────────────────────────────────
const LoginV2: React.FC = () => {
  const { user, hasPinSet } = useAuthStore();

  // Determine which screen to show
  const showUnlock = !!user && hasPinSet;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary-900/50 mb-4">
            <HushkeyLogo size={48} />
          </div>
          <h1 className="text-3xl font-bold text-white">HushKey Vault</h1>
          <p className="text-gray-400 text-sm mt-1">
            {showUnlock ? `Welcome back, ${user?.email}` : "Zero-knowledge password manager"}
          </p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          {showUnlock ? <PinUnlockScreen /> : <EmailScreen />}
        </div>
      </div>
    </div>
  );
};

export default LoginV2;
