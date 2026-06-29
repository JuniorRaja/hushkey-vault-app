/**
 * Onboarding Store - Manages the 4-step new-user onboarding flow.
 * Steps: 0=Name, 1=PIN, 2=Biometric, 3=SampleData
 */

import { create } from "zustand";
import EncryptionService from "../services/encryption";
import DatabaseService from "../services/database";
import IndexedDBService from "../services/indexedDB";
import { BiometricService } from "../services/biometric";

interface OnboardingFormData {
  name: string;
  pin: string;
  confirmPin: string;
  biometricEnabled: boolean;
  loadSampleData: boolean;
}

interface OnboardingState {
  isActive: boolean;
  currentStep: number;
  formData: OnboardingFormData;
  isComplete: boolean;
  errors: Partial<Record<keyof OnboardingFormData | "general", string>>;
  isSubmitting: boolean;
}

interface OnboardingActions {
  startOnboarding: () => void;
  setFormData: (data: Partial<OnboardingFormData>) => void;
  setError: (field: keyof OnboardingFormData | "general", message: string) => void;
  clearErrors: () => void;
  nextStep: () => void;
  previousStep: () => void;
  completeOnboarding: (userId: string, pin: string) => Promise<void>;
  resetOnboarding: () => void;
}

const INITIAL_FORM: OnboardingFormData = {
  name: "",
  pin: "",
  confirmPin: "",
  biometricEnabled: false,
  loadSampleData: false,
};

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  (set, get) => ({
    isActive: false,
    currentStep: 0,
    formData: { ...INITIAL_FORM },
    isComplete: false,
    errors: {},
    isSubmitting: false,

    startOnboarding: () =>
      set({ isActive: true, currentStep: 0, formData: { ...INITIAL_FORM }, errors: {}, isComplete: false }),

    setFormData: (data) =>
      set((state) => ({ formData: { ...state.formData, ...data } })),

    setError: (field, message) =>
      set((state) => ({ errors: { ...state.errors, [field]: message } })),

    clearErrors: () => set({ errors: {} }),

    nextStep: () => {
      const { currentStep, formData } = get();
      set({ errors: {} });

      if (currentStep === 0) {
        if (!formData.name.trim()) {
          set({ errors: { name: "Name is required" } });
          return;
        }
        if (formData.name.trim().length > 100) {
          set({ errors: { name: "Name must be under 100 characters" } });
          return;
        }
      }

      if (currentStep === 1) {
        if (formData.pin.length !== 6) {
          set({ errors: { pin: "PIN must be 6 digits" } });
          return;
        }
        if (formData.pin !== formData.confirmPin) {
          set({ errors: { confirmPin: "PINs do not match" } });
          return;
        }
      }

      set({ currentStep: currentStep + 1 });
    },

    previousStep: () => {
      const { currentStep } = get();
      if (currentStep > 0) set({ currentStep: currentStep - 1, errors: {} });
    },

    async completeOnboarding(userId, pin) {
      const { formData } = get();
      set({ isSubmitting: true, errors: {} });

      try {
        // 1. Create user profile with a fresh salt
        const salt = EncryptionService.generateSalt();
        await DatabaseService.createUserProfile(userId, salt);
        await IndexedDBService.saveUserProfile(userId, salt);

        // 2. Derive master key from PIN + stored salt
        const masterKey = await EncryptionService.deriveMasterKey(pin, salt);
        IndexedDBService.setMasterKey(masterKey);

        // 3. Save encrypted name
        if (formData.name.trim()) {
          await DatabaseService.updateUserProfileName(userId, formData.name.trim(), masterKey);
        }

        // 4. Save default settings
        const defaultSettings = {
          auto_lock_minutes: 5,
          clipboard_clear_seconds: 30,
          theme: "dark",
          allow_screenshots: false,
          biometric_enabled: formData.biometricEnabled,
        };
        await DatabaseService.saveUserSettings(userId, defaultSettings);
        await IndexedDBService.saveSettings(userId, defaultSettings);

        // 5. Register device
        const deviceId = EncryptionService.generateRandomString();
        const deviceName = navigator.userAgent.substring(0, 50);
        await DatabaseService.saveDevice(userId, deviceId, deviceName);
        await IndexedDBService.saveDevice(userId, deviceId, deviceName);

        // 6. Setup biometric if chosen
        if (formData.biometricEnabled) {
          try {
            await BiometricService.register(userId);
          } catch (err) {
            console.warn("Biometric setup failed, continuing without it:", err);
          }
        }

        // 7. Load sample data if chosen
        if (formData.loadSampleData) {
          try {
            const { loadSampleData } = await import("../services/sampleDataLoader");
            await loadSampleData(userId, masterKey);
          } catch (err) {
            console.warn("Sample data load failed:", err);
          }
        }

        // 8. Log activity
        await DatabaseService.logActivity(userId, "SIGNUP", "User account setup completed");
        await IndexedDBService.logActivity(userId, "SIGNUP", "User account setup completed");

        set({ isComplete: true, isActive: false, isSubmitting: false });
      } catch (err: any) {
        set({ errors: { general: err.message || "Setup failed. Please try again." }, isSubmitting: false });
        throw err;
      }
    },

    resetOnboarding: () =>
      set({ isActive: false, currentStep: 0, formData: { ...INITIAL_FORM }, errors: {}, isComplete: false, isSubmitting: false }),
  })
);
