/**
 * Auth Store (v2) - Focused on signin/unlock only.
 * Onboarding logic lives in onboarding.ts
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../supabaseClient";
import EncryptionService from "../services/encryption";
import DatabaseService from "../services/database";
import IndexedDBService from "../services/indexedDB";
import SecureMemoryService from "../services/secureMemory";
import RateLimiterService from "../services/rateLimiter";
import IntegrityCheckerService from "../services/integrityChecker";
import { BiometricService } from "../services/biometric";
import { SoundService } from "../services/soundService";
import { NotificationType } from "../../types";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  masterKey: Uint8Array | null;
  wrappedMasterKey: string | null;
  isUnlocked: boolean;
  deviceId: string;
  failedAttempts: number;
  lastActivity: number;
  autoLockMinutes: number;
  hasPinSet: boolean;
  biometricEnabled: boolean;
}

interface AuthActions {
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  lock: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<void>;
  setupMasterPin: (pin: string) => Promise<void>;
  hydrate: () => Promise<void>;
  updateActivity: () => void;
  setHasPinSet: (value: boolean) => void;
  setAutoLockMinutes: (minutes: number) => void;
  updateUserProfile: (updates: Partial<User>) => void;
  checkNewDevice: () => Promise<boolean>;
  logActivity: (action: string, details: string) => Promise<void>;
  clearState: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      masterKey: null,
      wrappedMasterKey: null,
      isUnlocked: false,
      deviceId: "",
      failedAttempts: 0,
      lastActivity: Date.now(),
      autoLockMinutes: 5,
      hasPinSet: false,
      biometricEnabled: false,

      setHasPinSet: (value) => set({ hasPinSet: value }),
      setAutoLockMinutes: (minutes) => set({ autoLockMinutes: minutes }),
      updateActivity: () => set({ lastActivity: Date.now() }),
      updateUserProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      async clearState() {
        const { user, masterKey } = get();
        if (masterKey) SecureMemoryService.secureWipe(masterKey);
        IntegrityCheckerService.clear();
        await SecureMemoryService.clearSecureStorage();
        RateLimiterService.clearAll();
        IndexedDBService.clearMasterKey();
        if (user) {
          await IndexedDBService.logActivity(user.id, "LOGOUT", "Session cleared");
        }
        await IndexedDBService.clearAll();
        set({ user: null, masterKey: null, wrappedMasterKey: null, isUnlocked: false, isLoading: false });
      },

      async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          if (error.message.includes("already registered") || error.message.includes("already been registered")) {
            throw new Error("An account with this email already exists");
          }
          throw error;
        }
        if (!data.user) throw new Error("Signup failed");
        if (!data.session) {
          throw new Error("Please check your email to confirm your account before logging in");
        }
        // Profile creation is deferred to onboarding.completeOnboarding()
        set({
          user: { id: data.user.id, email: data.user.email! },
          isLoading: false,
          isUnlocked: false,
          hasPinSet: false,
        });
      },

      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error("Login failed");

        const deviceName = navigator.userAgent.substring(0, 50);
        await IndexedDBService.logActivity(data.user.id, "LOGIN", `User signed in from ${deviceName}`);
        if (navigator.onLine) {
          try {
            await DatabaseService.logActivity(data.user.id, "LOGIN", `User signed in from ${deviceName}`);
          } catch { /* offline */ }
        }

        // Check if PIN is already set so routing goes to unlock, not onboarding
        let profileHasPin = false;
        try {
          const profile = await DatabaseService.getUserProfile(data.user.id);
          profileHasPin = !!profile?.pin_verification;
        } catch { /* offline — fall back to persisted hasPinSet */ }

        set({
          user: { id: data.user.id, email: data.user.email! },
          isLoading: false,
          isUnlocked: false,
          hasPinSet: profileHasPin,
        });
      },

      async signOut() {
        const { user, masterKey } = get();
        if (masterKey) SecureMemoryService.secureWipe(masterKey);
        IntegrityCheckerService.clear();
        await SecureMemoryService.clearSecureStorage();
        RateLimiterService.clearAll();
        IndexedDBService.clearMasterKey();
        if (user) {
          await IndexedDBService.logActivity(user.id, "LOGOUT", "User signed out");
          if (navigator.onLine) {
            try { await DatabaseService.logActivity(user.id, "LOGOUT", "User signed out"); } catch { /* offline */ }
          }
        }
        await supabase.auth.signOut();
        await IndexedDBService.clearAll();
        set({ user: null, masterKey: null, wrappedMasterKey: null, isUnlocked: false, isLoading: false });
      },

      async lock() {
        const { user, masterKey } = get();
        if (masterKey) SecureMemoryService.secureWipe(masterKey);
        IntegrityCheckerService.clear();
        IndexedDBService.clearMasterKey();
        if (user) {
          await IndexedDBService.logActivity(user.id, "LOCK", "Vault locked");
          if (navigator.onLine) {
            try { await DatabaseService.logActivity(user.id, "LOCK", "Vault locked"); } catch { /* offline */ }
          }
        }
        SoundService.playLockSound();
        set({ masterKey: null, isUnlocked: false, lastActivity: Date.now() });
      },

      async setupMasterPin(pin) {
        const { user } = get();
        if (!user) throw new Error("No user logged in");

        const profile = await DatabaseService.getUserProfile(user.id);
        if (!profile?.salt) throw new Error("User profile not found");

        const masterKey = await EncryptionService.deriveMasterKey(pin, profile.salt);
        const pinVerification = await EncryptionService.createPinVerification(masterKey);
        await DatabaseService.updatePinVerification(user.id, pinVerification);

        await SecureMemoryService.initializeWrappingKey();
        const wrappedMasterKey = await SecureMemoryService.wrapMasterKey(masterKey);
        await IntegrityCheckerService.initialize(masterKey);
        IndexedDBService.setMasterKey(masterKey);

        let settings = await DatabaseService.getUserSettings(user.id);
        if (!settings) {
          const defaultSettings = { auto_lock_minutes: 5, clipboard_clear_seconds: 30, theme: "dark", allow_screenshots: false };
          await DatabaseService.saveUserSettings(user.id, defaultSettings);
          settings = defaultSettings;
        }
        await IndexedDBService.saveSettings(user.id, settings);

        const userName = await DatabaseService.getUserProfileName(user.id, masterKey);
        SoundService.playLockSound();

        set({
          masterKey,
          wrappedMasterKey,
          isUnlocked: true,
          hasPinSet: true,
          lastActivity: Date.now(),
          autoLockMinutes: settings?.auto_lock_minutes ?? 5,
          user: userName ? { ...user, name: userName } : user,
        });

        await DatabaseService.logActivity(user.id, "CREATE", "Master PIN created");
        await IndexedDBService.logActivity(user.id, "CREATE", "Master PIN created");
        await get().checkNewDevice();
      },

      async unlockWithPin(pin) {
        const { user } = get();
        if (!user) throw new Error("No user logged in");

        const rateLimitCheck = RateLimiterService.canAttempt(user.id);
        if (!rateLimitCheck.allowed) throw new Error(rateLimitCheck.reason || "Too many attempts");

        try {
          let salt = await IndexedDBService.getUserProfile(user.id).then((p) => p?.salt);
          if (!salt) {
            const profile = await DatabaseService.getUserProfile(user.id);
            if (!profile?.salt) throw new Error("User profile not found");
            salt = profile.salt;
            await IndexedDBService.saveUserProfile(user.id, salt);
          }

          const masterKey = await EncryptionService.deriveMasterKey(pin, salt);
          const profile = await DatabaseService.getUserProfile(user.id);
          if (!profile?.pin_verification) throw new Error("PIN not set");

          const isValid = await EncryptionService.verifyPin(profile.pin_verification, masterKey);
          if (!isValid) throw new Error("Invalid PIN");

          await SecureMemoryService.initializeWrappingKey();
          await IntegrityCheckerService.initialize(masterKey);
          IndexedDBService.setMasterKey(masterKey);
          const wrappedMasterKey = await SecureMemoryService.wrapMasterKey(masterKey);

          let settings = await IndexedDBService.getSettings(user.id);
          let userName = null;
          if (navigator.onLine) {
            try {
              settings = await DatabaseService.getUserSettings(user.id);
              if (settings) await IndexedDBService.saveSettings(user.id, settings);
              userName = await DatabaseService.getUserProfileName(user.id, masterKey);
            } catch { /* offline */ }
          }

          RateLimiterService.recordSuccessfulAttempt(user.id);
          SoundService.playLockSound();

          set({
            masterKey,
            wrappedMasterKey,
            isUnlocked: true,
            hasPinSet: true,
            biometricEnabled: settings?.biometric_enabled || false,
            failedAttempts: 0,
            lastActivity: Date.now(),
            autoLockMinutes: settings?.auto_lock_minutes ?? 5,
            user: userName ? { ...user, name: userName } : user,
          });

          const deviceName = navigator.userAgent.substring(0, 50);
          await IndexedDBService.logActivity(user.id, "LOGIN", `Vault unlocked via PIN from ${deviceName}`);
          if (navigator.onLine) {
            try { await DatabaseService.logActivity(user.id, "LOGIN", `Vault unlocked via PIN from ${deviceName}`); } catch { /* offline */ }
          }

          await get().checkNewDevice();
          if (navigator.onLine) {
            const { useItemStore } = await import("./itemStore");
            useItemStore.getState().loadItems();
          }
        } catch (error) {
          RateLimiterService.recordFailedAttempt(user.id);
          const newFailedAttempts = get().failedAttempts + 1;
          const remaining = RateLimiterService.getRemainingAttempts(user.id);
          set({ failedAttempts: newFailedAttempts });

          const deviceName = navigator.userAgent.substring(0, 50);
          await IndexedDBService.logActivity(user.id, "FAILED_LOGIN", `Failed PIN attempt #${newFailedAttempts} from ${deviceName}`);
          if (navigator.onLine) {
            try {
              await DatabaseService.logActivity(user.id, "FAILED_LOGIN", `Failed PIN attempt #${newFailedAttempts} from ${deviceName}`);
              const settings = await DatabaseService.getUserSettings(user.id);
              if (settings) {
                const { default: notificationService } = await import("../services/notificationService");
                notificationService.sendNotification(user.id, NotificationType.SECURITY, "Failed Login Attempt", `A failed login attempt was detected from ${deviceName}.`, settings.notifications);
              }
            } catch { /* offline */ }
          }
          throw new Error(`Invalid PIN. ${remaining} attempts remaining.`);
        }
      },

      async unlockWithBiometrics() {
        const { user } = get();
        if (!user) throw new Error("No user logged in");

        const rateLimitCheck = RateLimiterService.canAttempt(user.id);
        if (!rateLimitCheck.allowed) throw new Error(rateLimitCheck.reason || "Too many attempts");

        try {
          const authenticated = await BiometricService.authenticate(user.id);
          if (!authenticated) throw new Error("Biometric authentication failed");

          const { wrappedMasterKey } = get();
          if (!wrappedMasterKey) throw new Error("Master key not found");

          const masterKey = await SecureMemoryService.unwrapMasterKey(wrappedMasterKey);
          await IntegrityCheckerService.initialize(masterKey);
          IndexedDBService.setMasterKey(masterKey);

          let settings = await IndexedDBService.getSettings(user.id);
          let userName = null;
          if (navigator.onLine) {
            try {
              settings = await DatabaseService.getUserSettings(user.id);
              if (settings) await IndexedDBService.saveSettings(user.id, settings);
              userName = await DatabaseService.getUserProfileName(user.id, masterKey);
            } catch { /* offline */ }
          }

          RateLimiterService.recordSuccessfulAttempt(user.id);
          SoundService.playLockSound();

          set({
            masterKey,
            isUnlocked: true,
            biometricEnabled: settings?.biometric_enabled || false,
            failedAttempts: 0,
            lastActivity: Date.now(),
            autoLockMinutes: settings?.auto_lock_minutes ?? 5,
            user: userName ? { ...user, name: userName } : user,
          });

          const deviceName = navigator.userAgent.substring(0, 50);
          await IndexedDBService.logActivity(user.id, "LOGIN", `Vault unlocked via biometrics from ${deviceName}`);
          if (navigator.onLine) {
            try { await DatabaseService.logActivity(user.id, "LOGIN", `Vault unlocked via biometrics from ${deviceName}`); } catch { /* offline */ }
          }

          await get().checkNewDevice();
          if (navigator.onLine) {
            const { useItemStore } = await import("./itemStore");
            useItemStore.getState().loadItems();
          }
        } catch (error: any) {
          RateLimiterService.recordFailedAttempt(user.id);
          const newFailedAttempts = get().failedAttempts + 1;
          const remaining = RateLimiterService.getRemainingAttempts(user.id);
          set({ failedAttempts: newFailedAttempts });

          const deviceName = navigator.userAgent.substring(0, 50);
          await IndexedDBService.logActivity(user.id, "FAILED_LOGIN", `Failed biometric attempt #${newFailedAttempts} from ${deviceName}`);
          if (navigator.onLine) {
            try {
              await DatabaseService.logActivity(user.id, "FAILED_LOGIN", `Failed biometric attempt #${newFailedAttempts} from ${deviceName}`);
              const settings = await DatabaseService.getUserSettings(user.id);
              if (settings) {
                const { default: notificationService } = await import("../services/notificationService");
                notificationService.sendNotification(user.id, NotificationType.SECURITY, "Failed Login Attempt", `A failed biometric login attempt was detected from ${deviceName}.`, settings.notifications);
              }
            } catch { /* offline */ }
          }
          throw new Error(`Biometric authentication failed. ${remaining} attempts remaining.`);
        }
      },

      async checkNewDevice() {
        const { user } = get();
        if (!user) return false;

        let storedDeviceId = localStorage.getItem("hushkey_device_id");
        const screenRes = `${window.screen.width}x${window.screen.height}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const fingerprintBase = `${screenRes}-${timezone}-${navigator.language}-${navigator.platform}-${navigator.hardwareConcurrency || 1}`;
        let hash = 0;
        for (let i = 0; i < fingerprintBase.length; i++) {
          const char = fingerprintBase.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }
        const fingerprint = Math.abs(hash).toString(16);
        const deviceName = navigator.userAgent.substring(0, 50);
        const metadata = { fingerprint, userAgent: navigator.userAgent };

        if (!storedDeviceId) {
          let knownFingerprint = false;
          try {
            if (navigator.onLine) knownFingerprint = await DatabaseService.isFingerprintKnown(user.id, fingerprint);
          } catch { /* ignore */ }

          storedDeviceId = EncryptionService.generateRandomString();
          localStorage.setItem("hushkey_device_id", storedDeviceId);
          set({ deviceId: storedDeviceId });
          await DatabaseService.saveDevice(user.id, storedDeviceId, deviceName, metadata);
          await IndexedDBService.saveDevice(user.id, storedDeviceId, deviceName);

          if (!knownFingerprint) {
            await DatabaseService.logActivity(user.id, "SECURITY", "New device login detected (Fingerprint: " + fingerprint + ")");
            await IndexedDBService.logActivity(user.id, "SECURITY", "New device login detected");
            try {
              const settings = await DatabaseService.getUserSettings(user.id);
              if (settings) {
                const { default: notificationService } = await import("../services/notificationService");
                notificationService.sendNotification(user.id, NotificationType.SECURITY, "New Device Detected", `Your account was accessed from a new device: ${deviceName}.`, settings.notifications);
              }
            } catch { /* ignore */ }
            return true;
          }
          return false;
        } else {
          set({ deviceId: storedDeviceId });
          if (navigator.onLine) {
            DatabaseService.saveDevice(user.id, storedDeviceId, deviceName, metadata).catch(console.error);
          }
        }
        return false;
      },

      async logActivity(action, details) {
        const { user } = get();
        if (user) {
          await DatabaseService.logActivity(user.id, action, details);
          await IndexedDBService.logActivity(user.id, action, details);
        }
      },

      async hydrate() {
        const state = get();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          set({ user: null, masterKey: null, wrappedMasterKey: null, isUnlocked: false, isLoading: false });
          return;
        }

        if (!state.user || state.user.id !== session.user.id) {
          let profileHasPin = false;
          let biometricEnabled = false;
          try {
            const profile = await DatabaseService.getUserProfile(session.user.id);
            profileHasPin = !!profile?.pin_verification;

            let settings = null;
            if (navigator.onLine) {
              try {
                settings = await DatabaseService.getUserSettings(session.user.id);
                if (settings) await IndexedDBService.saveSettings(session.user.id, settings);
              } catch { /* offline */ }
            }
            biometricEnabled = settings?.biometric_enabled || false;
          } catch (err) {
            console.error("Hydrate: Error loading profile:", err);
          }

          set({
            user: { id: session.user.id, email: session.user.email! },
            isLoading: false,
            hasPinSet: profileHasPin,
            biometricEnabled,
            masterKey: null,
            wrappedMasterKey: null,
            isUnlocked: false,
          });
          return;
        }

        if (state.isUnlocked && state.wrappedMasterKey) {
          const timeSince = Date.now() - state.lastActivity;
          const autoLockMs = state.autoLockMinutes * 60 * 1000;
          if (timeSince > autoLockMs) {
            get().lock();
          } else {
            try {
              const masterKey = await SecureMemoryService.unwrapMasterKey(state.wrappedMasterKey);
              await IntegrityCheckerService.initialize(masterKey);
              IndexedDBService.setMasterKey(masterKey);
              set({ masterKey, isLoading: false });
            } catch {
              get().lock();
            }
          }
        } else {
          if (state.isUnlocked) get().lock();
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "hushkey-auth",
      partialize: (state) => ({
        user: state.user,
        wrappedMasterKey: state.wrappedMasterKey,
        deviceId: state.deviceId,
        lastActivity: state.lastActivity,
        autoLockMinutes: state.autoLockMinutes,
        hasPinSet: state.hasPinSet,
        biometricEnabled: state.biometricEnabled,
      }),
    }
  )
);
