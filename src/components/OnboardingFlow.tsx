import React, { useState } from "react";
import { User, Lock, ScanFace, Database, ChevronLeft, Loader2, Delete, Check } from "lucide-react";
import { useOnboardingStore } from "../stores/onboarding";
import { useAuthStore } from "../stores/auth";

const HushkeyLogo = () => (
  <img src="/hushkey-icon.png" alt="HushKey" className="w-12 h-12" />
);

// ── Step 1: Personalize Name ──────────────────────────────────────────────────
const PersonalizeNameScreen: React.FC = () => {
  const { formData, setFormData, errors, nextStep } = useOnboardingStore();

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User size={28} className="text-primary-400" />
        </div>
        <h2 className="text-xl font-bold text-white">What should we call you?</h2>
        <p className="text-gray-400 text-sm mt-1">This name is stored encrypted in your vault.</p>
      </div>

      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ name: e.target.value })}
        placeholder="Your name"
        maxLength={100}
        className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-gray-700 focus:border-primary-500 focus:outline-none"
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && nextStep()}
      />
      {errors.name && <p className="text-red-400 text-sm -mt-4">{errors.name}</p>}

      <button
        onClick={nextStep}
        className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
      >
        Continue
      </button>
    </div>
  );
};

// ── Step 2: Set PIN ───────────────────────────────────────────────────────────
const SetPINScreen: React.FC = () => {
  const { formData, setFormData, errors, nextStep } = useOnboardingStore();
  const [confirmingPin, setConfirmingPin] = useState(false);

  const currentPin = confirmingPin ? formData.confirmPin : formData.pin;

  const handleNumber = (num: string) => {
    if (confirmingPin) {
      if (formData.confirmPin.length >= 6) return;
      const next = formData.confirmPin + num;
      setFormData({ confirmPin: next });
      if (next.length === 6) setTimeout(() => nextStep(), 100);
    } else {
      if (formData.pin.length >= 6) return;
      const next = formData.pin + num;
      setFormData({ pin: next });
      if (next.length === 6) setTimeout(() => setConfirmingPin(true), 200);
    }
  };

  const handleDelete = () => {
    if (confirmingPin) {
      setFormData({ confirmPin: formData.confirmPin.slice(0, -1) });
    } else {
      setFormData({ pin: formData.pin.slice(0, -1) });
    }
  };

  const handleBack = () => {
    if (confirmingPin) {
      setConfirmingPin(false);
      setFormData({ pin: "", confirmPin: "" });
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-primary-400" />
        </div>
        <h2 className="text-xl font-bold text-white">
          {confirmingPin ? "Confirm your PIN" : "Set your Master PIN"}
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          {confirmingPin ? "Enter the same 6-digit PIN again" : "This PIN unlocks your vault"}
        </p>
      </div>

      <div className="flex gap-3 h-8 items-center">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-200 ${
              i < currentPin.length
                ? errors.confirmPin
                  ? "bg-red-500 w-3 h-3"
                  : "bg-primary-500 w-3 h-3 scale-110"
                : "bg-gray-700 w-3 h-3"
            }`}
          />
        ))}
      </div>

      {(errors.pin || errors.confirmPin) && (
        <p className="text-red-400 text-sm -mt-4">{errors.pin || errors.confirmPin}</p>
      )}

      <div className="grid grid-cols-3 gap-4 w-full px-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumber(num.toString())}
            className="w-16 h-16 rounded-full bg-gray-900/50 hover:bg-gray-800 border border-gray-800 text-2xl font-medium text-white transition-all active:scale-95 mx-auto"
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleBack}
          disabled={!confirmingPin}
          className="w-16 h-16 rounded-full text-gray-500 hover:text-white hover:bg-white/5 transition-all active:scale-95 mx-auto disabled:opacity-0"
        >
          <ChevronLeft size={24} className="mx-auto" />
        </button>
        <button
          onClick={() => handleNumber("0")}
          className="w-16 h-16 rounded-full bg-gray-900/50 hover:bg-gray-800 border border-gray-800 text-2xl font-medium text-white transition-all active:scale-95 mx-auto"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-16 h-16 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all active:scale-95 mx-auto"
        >
          <Delete size={22} className="mx-auto" />
        </button>
      </div>
    </div>
  );
};

// ── Step 3: Enable Biometric ──────────────────────────────────────────────────
const EnableBiometricScreen: React.FC = () => {
  const { formData, setFormData, nextStep } = useOnboardingStore();

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ScanFace size={28} className="text-primary-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Enable Biometric Unlock?</h2>
        <p className="text-gray-400 text-sm mt-1">
          Use Face ID or fingerprint to unlock your vault quickly.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => { setFormData({ biometricEnabled: true }); nextStep(); }}
          className={`w-full py-4 rounded-xl border-2 text-left px-5 transition-all ${
            formData.biometricEnabled
              ? "border-primary-500 bg-primary-600/10"
              : "border-gray-700 hover:border-gray-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <ScanFace size={20} className="text-primary-400 shrink-0" />
            <div>
              <p className="text-white font-medium">Enable Biometrics</p>
              <p className="text-gray-400 text-sm">Faster, more convenient unlock</p>
            </div>
            {formData.biometricEnabled && <Check size={18} className="text-primary-400 ml-auto" />}
          </div>
        </button>

        <button
          onClick={() => { setFormData({ biometricEnabled: false }); nextStep(); }}
          className="w-full py-4 rounded-xl border-2 border-gray-700 hover:border-gray-600 text-left px-5 transition-all"
        >
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-white font-medium">PIN Only</p>
              <p className="text-gray-400 text-sm">Use your 6-digit PIN to unlock</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

// ── Step 4: Load Sample Data ──────────────────────────────────────────────────
const LoadSampleDataScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { formData, setFormData, errors, isSubmitting } = useOnboardingStore();

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="w-14 h-14 bg-primary-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Database size={28} className="text-primary-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Load Sample Data?</h2>
        <p className="text-gray-400 text-sm mt-1">
          Add a few example items to explore HushKey Vault.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => setFormData({ loadSampleData: true })}
          className={`w-full py-4 rounded-xl border-2 text-left px-5 transition-all ${
            formData.loadSampleData
              ? "border-primary-500 bg-primary-600/10"
              : "border-gray-700 hover:border-gray-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <Database size={20} className="text-primary-400 shrink-0" />
            <div>
              <p className="text-white font-medium">Yes, add sample items</p>
              <p className="text-gray-400 text-sm">1 vault, 3 sample items to explore</p>
            </div>
            {formData.loadSampleData && <Check size={18} className="text-primary-400 ml-auto" />}
          </div>
        </button>

        <button
          onClick={() => setFormData({ loadSampleData: false })}
          className={`w-full py-4 rounded-xl border-2 text-left px-5 transition-all ${
            !formData.loadSampleData
              ? "border-primary-500 bg-primary-600/10"
              : "border-gray-700 hover:border-gray-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-white font-medium">Start with empty vault</p>
              <p className="text-gray-400 text-sm">Add your own items from scratch</p>
            </div>
            {!formData.loadSampleData && <Check size={18} className="text-primary-400 ml-auto" />}
          </div>
        </button>
      </div>

      {errors.general && (
        <p className="text-red-400 text-sm text-center">{errors.general}</p>
      )}

      <button
        onClick={onComplete}
        disabled={isSubmitting}
        className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSubmitting && <Loader2 size={18} className="animate-spin" />}
        {isSubmitting ? "Setting up your vault…" : "Finish Setup"}
      </button>
    </div>
  );
};

// ── Orchestrator ──────────────────────────────────────────────────────────────
const STEPS = [
  { label: "Name", icon: User },
  { label: "PIN", icon: Lock },
  { label: "Biometric", icon: ScanFace },
  { label: "Data", icon: Database },
];

const OnboardingFlow: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { currentStep, previousStep, completeOnboarding, formData } = useOnboardingStore();
  const { user, setupMasterPin } = useAuthStore();

  const handleComplete = async () => {
    if (!user) return;
    try {
      // Step 1: Create profile + store salt, then derive master key from that salt
      await completeOnboarding(user.id, formData.pin);

      // Step 2: setupMasterPin reads the stored salt and sets isUnlocked = true
      await setupMasterPin(formData.pin);

      onDone();
    } catch {
      // errors shown in LoadSampleDataScreen
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <HushkeyLogo />
          <h1 className="text-2xl font-bold text-white mt-3">HushKey Vault</h1>
          <p className="text-gray-400 text-sm mt-1">Let's set up your vault</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.label}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < currentStep
                    ? "bg-primary-600 text-white"
                    : i === currentStep
                    ? "bg-primary-600/30 border-2 border-primary-500 text-primary-400"
                    : "bg-gray-800 text-gray-600"
                }`}
              >
                {i < currentStep ? <Check size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 transition-all ${i < currentStep ? "bg-primary-600" : "bg-gray-800"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          {currentStep === 0 && <PersonalizeNameScreen />}
          {currentStep === 1 && <SetPINScreen />}
          {currentStep === 2 && <EnableBiometricScreen />}
          {currentStep === 3 && <LoadSampleDataScreen onComplete={handleComplete} />}
        </div>

        {/* Back button (not on step 0) */}
        {currentStep > 0 && currentStep < 3 && (
          <button
            onClick={previousStep}
            className="mt-4 flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors mx-auto"
          >
            <ChevronLeft size={16} /> Back
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingFlow;
