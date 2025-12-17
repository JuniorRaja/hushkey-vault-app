/**
 * Auth Store using Zustand
 * Manages authentication, master key, and unlock state
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

interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  masterKey: Uint8Array | null;
  wrappedMasterKey: string | null;
  isUnlocked: boolean;
  deviceId: string;
  unlockMethod: "pin" | "biometric" | "password";
  failedAttempts: number;
  lastActivity: number;
  autoLockMinutes: number;
  hasPinSet: boolean;
  biometricEnabled: boolean;
  onboardingStep: number | null;
}

interface AuthActions {
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: "google" | "github") => Promise<void>;
  handleOAuthCallback: () => Promise<void>;
  signOut: () => Promise<void>;
  lock: () => Promise<void>;
  setupMasterPin: (pin: string) => Promise<void>;
  setupMasterPinForOnboarding: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<void>;
  setUnlockMethod: (method: "pin" | "biometric" | "password") => void;
  updateUserProfile: (updates: Partial<User>) => void;
  checkNewDevice: () => Promise<boolean>;
  logActivity: (action: string, details: string) => Promise<void>;
  updateActivity: () => void;
  hydrate: () => Promise<void>;
  setHasPinSet: (value: boolean) => void;
  clearState: () => Promise<void>;
  setOnboardingStep: (step: number | null) => void;
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
      unlockMethod: "password",
      failedAttempts: 0,
      lastActivity: Date.now(),
      autoLockMinutes: 5,
      hasPinSet: false,
      biometricEnabled: false,
      onboardingStep: null,

      setHasPinSet(value: boolean) {
        set({ hasPinSet: value });
      },

      setOnboardingStep(step: number | null) {
        set({ onboardingStep: step });
      },

      async clearState() {
        const { user, masterKey } = get();

        // Securely wipe master key from memory
        if (masterKey) {
          SecureMemoryService.secureWipe(masterKey);
        }

        // Clear all security services
        IntegrityCheckerService.clear();
        await SecureMemoryService.clearSecureStorage();
        RateLimiterService.clearAll();
        IndexedDBService.clearMasterKey();

        if (user) {
          // Log local logout if needed, but this is triggered by Supabase event
          await IndexedDBService.logActivity(
            user.id,
            "LOGOUT",
            "Session improved cleared"
          );
        }

        await IndexedDBService.clearAll();

        set({
          user: null,
          masterKey: null,
          wrappedMasterKey: null,
          isUnlocked: false,
          isLoading: false,
        });
      },

      async signUp(email: string, password: string) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          if (
            error.message.includes("already registered") ||
            error.message.includes("already been registered")
          ) {
            throw new Error("An account with this email already exists");
          }
          throw error;
        }
        if (!data.user) throw new Error("Signup failed");

        if (!data.session) {
          throw new Error(
            "Please check your email to confirm your account before logging in"
          );
        }

        try {
          const salt = EncryptionService.generateSalt();
          await DatabaseService.createUserProfile(data.user.id, salt);
          await IndexedDBService.saveUserProfile(data.user.id, salt);

          const defaultSettings = {
            auto_lock_minutes: 5,
            clipboard_clear_seconds: 30,
            theme: "dark",
            allow_screenshots: false,
          };
          await DatabaseService.saveUserSettings(data.user.id, defaultSettings);

          const deviceId = EncryptionService.generateRandomString();
          const deviceName = navigator.userAgent.substring(0, 50);
          await DatabaseService.saveDevice(data.user.id, deviceId, deviceName);
          await IndexedDBService.saveDevice(data.user.id, deviceId, deviceName);

          await DatabaseService.logActivity(
            data.user.id,
            "SIGNUP",
            "User account created"
          );
          await IndexedDBService.logActivity(
            data.user.id,
            "SIGNUP",
            "User account created"
          );

          set({
            user: { id: data.user.id, email: data.user.email! },
            deviceId,
            isLoading: false,
            isUnlocked: false,
            autoLockMinutes: 5,
          });
        } catch (err) {
          console.error("Error during signup data creation:", err);
          throw err;
        }
      },

      async signIn(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (!data.user) throw new Error("Login failed");

        // Log signin event
        const deviceName = navigator.userAgent.substring(0, 50);
        await IndexedDBService.logActivity(
          data.user.id,
          "LOGIN",
          `User signed in from ${deviceName}`
        );

        // Check if profile exists; if not, create it (Email Confirmation Flow)
        try {
          const profile = await DatabaseService.getUserProfile(data.user.id);
          if (!profile) {
            console.log(
              "User profile missing (likely email verified) - Creating now..."
            );
            const salt = EncryptionService.generateSalt();
            await DatabaseService.createUserProfile(data.user.id, salt);
            await IndexedDBService.saveUserProfile(data.user.id, salt);

            const defaultSettings = {
              auto_lock_minutes: 5,
              clipboard_clear_seconds: 30,
              theme: "dark",
              allow_screenshots: false,
            };
            await DatabaseService.saveUserSettings(
              data.user.id,
              defaultSettings
            );

            // Create device entry
            const deviceId = EncryptionService.generateRandomString();
            await DatabaseService.saveDevice(
              data.user.id,
              deviceId,
              deviceName
            );
            await IndexedDBService.saveDevice(
              data.user.id,
              deviceId,
              deviceName
            );

            set({ deviceId });
          }
        } catch (err) {
          console.error("Error ensuring profile exists:", err);
          // Don't block login, but subsequent actions might fail
        }

        if (navigator.onLine) {
          try {
            await DatabaseService.logActivity(
              data.user.id,
              "LOGIN",
              `User signed in from ${deviceName}`
            );
          } catch (error) {
            console.log("Failed to log to server");
          }
        }

        set({
          user: { id: data.user.id, email: data.user.email! },
          isLoading: false,
          isUnlocked: false,
          autoLockMinutes: 5,
        });
      },

      async signInWithOAuth(provider: "google" | "github") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin,
          },
        });

        if (error) throw error;
      },

      async handleOAuthCallback() {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("[OAuth] Session error:", error);
          throw error;
        }
        if (!session?.user) {
          console.error("[OAuth] No session found");
          throw new Error("No session found");
        }

        const userId = session.user.id;
        const email = session.user.email!;

        // Check if profile exists
        let profile = await DatabaseService.getUserProfile(userId);

        if (!profile) {
          const salt = EncryptionService.generateSalt();
          await DatabaseService.createUserProfile(userId, salt);
          await IndexedDBService.saveUserProfile(userId, salt);

          const defaultSettings = {
            auto_lock_minutes: 5,
            clipboard_clear_seconds: 30,
            theme: "dark",
            allow_screenshots: false,
          };
          await DatabaseService.saveUserSettings(userId, defaultSettings);
          await IndexedDBService.saveSettings(userId, defaultSettings);

          const deviceId = EncryptionService.generateRandomString();
          const deviceName = navigator.userAgent.substring(0, 50);
          await DatabaseService.saveDevice(userId, deviceId, deviceName);
          await IndexedDBService.saveDevice(userId, deviceId, deviceName);

          await DatabaseService.logActivity(
            userId,
            "SIGNUP",
            "User account created via OAuth"
          );
          await IndexedDBService.logActivity(
            userId,
            "SIGNUP",
            "User account created via OAuth"
          );

          set({
            user: { id: userId, email },
            deviceId,
            isLoading: false,
            isUnlocked: false,
            hasPinSet: false,
            autoLockMinutes: 5,
          });
        } else {
          // Existing user
          const deviceName = navigator.userAgent.substring(0, 50);
          await IndexedDBService.logActivity(
            userId,
            "LOGIN",
            `User signed in via OAuth from ${deviceName}`
          );
          if (navigator.onLine) {
            try {
              await DatabaseService.logActivity(
                userId,
                "LOGIN",
                `User signed in via OAuth from ${deviceName}`
              );
            } catch (error) {
              console.log("Failed to log to server");
            }
          }

          set({
            user: { id: userId, email },
            isLoading: false,
            isUnlocked: false,
            hasPinSet: !!profile.pin_verification,
            autoLockMinutes: 5,
          });
        }
      },

      async signOut() {
        const { user, masterKey } = get();

        // Securely wipe master key from memory
        if (masterKey) {
          SecureMemoryService.secureWipe(masterKey);
        }

        // Clear all security services
        IntegrityCheckerService.clear();
        await SecureMemoryService.clearSecureStorage();
        RateLimiterService.clearAll();
        IndexedDBService.clearMasterKey();

        if (user) {
          await IndexedDBService.logActivity(
            user.id,
            "LOGOUT",
            "User signed out"
          );
          if (navigator.onLine) {
            try {
              await DatabaseService.logActivity(
                user.id,
                "LOGOUT",
                "User signed out"
              );
            } catch (error) {
              console.log("Failed to log to server (offline)");
            }
          }
        }

        await supabase.auth.signOut();
        await IndexedDBService.clearAll();

        set({
          user: null,
          masterKey: null,
          wrappedMasterKey: null,
          isUnlocked: false,
          isLoading: false,
        });
      },

      async lock() {
        const { user, masterKey } = get();

        // Securely wipe master key from memory
        if (masterKey) {
          SecureMemoryService.secureWipe(masterKey);
        }

        // Clear integrity checker
        IntegrityCheckerService.clear();
        IndexedDBService.clearMasterKey();

        if (user) {
          await IndexedDBService.logActivity(user.id, "LOCK", "Vault locked");
          if (navigator.onLine) {
            try {
              await DatabaseService.logActivity(
                user.id,
                "LOCK",
                "Vault locked"
              );
            } catch (error) {
              console.log("Failed to log to server (offline)");
            }
          }
        }

        SoundService.playLockSound();

        set({
          masterKey: null,
          isUnlocked: false,
          lastActivity: Date.now(),
        });
      },

      async setupMasterPin(pin: string) {
        const { user } = get();
        if (!user) throw new Error("No user logged in");

        const profile = await DatabaseService.getUserProfile(user.id);
        if (!profile?.salt) throw new Error("User profile not found");

        const masterKey = await EncryptionService.deriveMasterKey(
          pin,
          profile.salt
        );
        const pinVerification = await EncryptionService.createPinVerification(
          masterKey
        );
        await DatabaseService.updatePinVerification(user.id, pinVerification);

        await SecureMemoryService.initializeWrappingKey();
        const wrappedMasterKey = await SecureMemoryService.wrapMasterKey(
          masterKey
        );

        await IntegrityCheckerService.initialize(masterKey);
        IndexedDBService.setMasterKey(masterKey);

        // Load and cache settings
        let settings = await DatabaseService.getUserSettings(user.id);
        if (!settings) {
          const defaultSettings = {
            auto_lock_minutes: 5,
            clipboard_clear_seconds: 30,
            theme: "dark",
            allow_screenshots: false,
          };
          await DatabaseService.saveUserSettings(user.id, defaultSettings);
          settings = defaultSettings;
        }
        await IndexedDBService.saveSettings(user.id, settings);

        const userName = await DatabaseService.getUserProfileName(
          user.id,
          masterKey
        );
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

        await DatabaseService.logActivity(
          user.id,
          "CREATE",
          "Master PIN created"
        );
        await IndexedDBService.logActivity(
          user.id,
          "CREATE",
          "Master PIN created"
        );
        await get().checkNewDevice();
      },

      // For onboarding: sets up PIN but does NOT unlock vault
      async setupMasterPinForOnboarding(pin: string) {
        const { user } = get();
        if (!user) throw new Error("No user logged in");

        const profile = await DatabaseService.getUserProfile(user.id);
        if (!profile?.salt) throw new Error("User profile not found");

        const masterKey = await EncryptionService.deriveMasterKey(
          pin,
          profile.salt
        );
        const pinVerification = await EncryptionService.createPinVerification(
          masterKey
        );
        await DatabaseService.updatePinVerification(user.id, pinVerification);

        await SecureMemoryService.initializeWrappingKey();
        const wrappedMasterKey = await SecureMemoryService.wrapMasterKey(
          masterKey
        );

        await IntegrityCheckerService.initialize(masterKey);
        IndexedDBService.setMasterKey(masterKey);

        // Load and cache settings
        let settings = await DatabaseService.getUserSettings(user.id);
        if (!settings) {
          const defaultSettings = {
            auto_lock_minutes: 5,
            clipboard_clear_seconds: 30,
            theme: "dark",
            allow_screenshots: false,
          };
          await DatabaseService.saveUserSettings(user.id, defaultSettings);
          settings = defaultSettings;
        }
        await IndexedDBService.saveSettings(user.id, settings);

        // Store masterKey and wrappedMasterKey but do NOT unlock yet
        set({
          masterKey,
          wrappedMasterKey,
          hasPinSet: true,
          lastActivity: Date.now(),
          autoLockMinutes: settings?.auto_lock_minutes ?? 5,
        });

        await DatabaseService.logActivity(
          user.id,
          "CREATE",
          "Master PIN created"
        );
        await IndexedDBService.logActivity(
          user.id,
          "CREATE",
          "Master PIN created"
        );
        await get().checkNewDevice();
      },

      async unlockWithPin(pin: string) {
        const { user } = get();
        if (!user) throw new Error("No user logged in");

        // Check rate limiting
        const rateLimitCheck = RateLimiterService.canAttempt(user.id);
        if (!rateLimitCheck.allowed) {
          throw new Error(rateLimitCheck.reason || "Too many attempts");
        }

        try {
          // Try to get salt from IndexedDB cache first
          let salt = await IndexedDBService.getUserProfile(user.id).then(
            (p) => p?.salt
          );

          if (!salt) {
            // Fallback to server if not cached
            const profile = await DatabaseService.getUserProfile(user.id);
            if (!profile?.salt) throw new Error("User profile not found");
            salt = profile.salt;
            await IndexedDBService.saveUserProfile(user.id, salt);
          }

          // Derive master key from PIN
          const masterKey = await EncryptionService.deriveMasterKey(pin, salt);

          // Verify PIN by attempting to decrypt verification hash from server
          const profile = await DatabaseService.getUserProfile(user.id);
          if (!profile?.pin_verification) throw new Error("PIN not set");

          const isValid = await EncryptionService.verifyPin(
            profile.pin_verification,
            masterKey
          );
          if (!isValid) {
            throw new Error("Invalid PIN");
          }

          // Initialize secure memory and integrity checker
          await SecureMemoryService.initializeWrappingKey();
          await IntegrityCheckerService.initialize(masterKey);
          IndexedDBService.setMasterKey(masterKey);

          // Wrap master key for secure storage
          const wrappedMasterKey = await SecureMemoryService.wrapMasterKey(
            masterKey
          );

          // Try to load settings from cache first, then Supabase
          let settings = await IndexedDBService.getSettings(user.id);
          let userName = null;

          if (navigator.onLine) {
            try {
              settings = await DatabaseService.getUserSettings(user.id);
              if (settings) {
                await IndexedDBService.saveSettings(user.id, settings);
              }
              userName = await DatabaseService.getUserProfileName(
                user.id,
                masterKey
              );
            } catch (error) {
              console.log("Using cached settings (offline)");
            }
          }

          const biometricEnabled = settings?.biometric_enabled || false;

          // Record successful attempt
          RateLimiterService.recordSuccessfulAttempt(user.id);

          SoundService.playLockSound();

          set({
            masterKey,
            wrappedMasterKey,
            isUnlocked: true,
            hasPinSet: true,
            biometricEnabled,
            failedAttempts: 0,
            lastActivity: Date.now(),
            autoLockMinutes: settings?.auto_lock_minutes ?? 5,
            user: userName ? { ...user, name: userName } : user,
          });

          // Log unlock
          const deviceName = navigator.userAgent.substring(0, 50);
          await IndexedDBService.logActivity(
            user.id,
            "LOGIN",
            `Vault unlocked via PIN from ${deviceName}`
          );
          if (navigator.onLine) {
            try {
              await DatabaseService.logActivity(
                user.id,
                "LOGIN",
                `Vault unlocked via PIN from ${deviceName}`
              );
            } catch (error) {
              console.log("Failed to log to server (offline)");
            }
          }

          // Check and update device
          await get().checkNewDevice();

          if (navigator.onLine) {
            // Load items after successful unlock
            const { useItemStore } = await import("./itemStore");
            useItemStore.getState().loadItems();
          }
        } catch (error) {
          // Record failed attempt
          RateLimiterService.recordFailedAttempt(user.id);

          const newFailedAttempts = get().failedAttempts + 1;
          const remaining = RateLimiterService.getRemainingAttempts(user.id);
          set({ failedAttempts: newFailedAttempts });

          // Log failed attempt
          const deviceName = navigator.userAgent.substring(0, 50);
          await IndexedDBService.logActivity(
            user.id,
            "FAILED_LOGIN",
            `Failed PIN attempt #${newFailedAttempts} from ${deviceName}`
          );
          if (navigator.onLine) {
            try {
              await DatabaseService.logActivity(
                user.id,
                "FAILED_LOGIN",
                `Failed PIN attempt #${newFailedAttempts} from ${deviceName}`
              );
            } catch (error) {
              console.log("Failed to log to server (offline)");
            }
          }

          throw new Error(`Invalid PIN. ${remaining} attempts remaining.`);
        }
      },

      async unlockWithBiometrics() {
        const { user } = get();
        if (!user) throw new Error("No user logged in");

        // Check rate limiting
        const rateLimitCheck = RateLimiterService.canAttempt(user.id);
        if (!rateLimitCheck.allowed) {
          throw new Error(rateLimitCheck.reason || "Too many attempts");
        }

        try {
          const authenticated = await BiometricService.authenticate(user.id);
          if (!authenticated)
            throw new Error("Biometric authentication failed");

          // Retrieve master key from secure storage
          const { wrappedMasterKey } = get();
          if (!wrappedMasterKey) throw new Error("Master key not found");

          const masterKey = await SecureMemoryService.unwrapMasterKey(
            wrappedMasterKey
          );
          await IntegrityCheckerService.initialize(masterKey);
          IndexedDBService.setMasterKey(masterKey);

          // Try to load settings from cache first, then Supabase
          let settings = await IndexedDBService.getSettings(user.id);
          let userName = null;

          if (navigator.onLine) {
            try {
              settings = await DatabaseService.getUserSettings(user.id);
              if (settings) {
                await IndexedDBService.saveSettings(user.id, settings);
              }
              userName = await DatabaseService.getUserProfileName(
                user.id,
                masterKey
              );
            } catch (error) {
              console.log("Using cached settings (offline)");
            }
          }

          const biometricEnabled = settings?.biometric_enabled || false;

          // Record successful attempt
          RateLimiterService.recordSuccessfulAttempt(user.id);

          SoundService.playLockSound();

          set({
            masterKey,
            isUnlocked: true,
            biometricEnabled,
            failedAttempts: 0,
            lastActivity: Date.now(),
            autoLockMinutes: settings?.auto_lock_minutes ?? 5,
            user: userName ? { ...user, name: userName } : user,
          });

          // Log unlock
          const deviceName = navigator.userAgent.substring(0, 50);
          await IndexedDBService.logActivity(
            user.id,
            "LOGIN",
            `Vault unlocked via biometrics from ${deviceName}`
          );
          if (navigator.onLine) {
            try {
              await DatabaseService.logActivity(
                user.id,
                "LOGIN",
                `Vault unlocked via biometrics from ${deviceName}`
              );
            } catch (error) {
              console.log("Failed to log to server (offline)");
            }
          }

          await get().checkNewDevice();

          if (navigator.onLine) {
            // Load items after successful unlock
            const { useItemStore } = await import("./itemStore");
            useItemStore.getState().loadItems();
          }
        } catch (error) {
          // Record failed attempt
          RateLimiterService.recordFailedAttempt(user.id);

          const newFailedAttempts = get().failedAttempts + 1;
          const remaining = RateLimiterService.getRemainingAttempts(user.id);
          set({ failedAttempts: newFailedAttempts });

          // Log failed attempt
          const deviceName = navigator.userAgent.substring(0, 50);
          await IndexedDBService.logActivity(
            user.id,
            "FAILED_LOGIN",
            `Failed biometric attempt #${newFailedAttempts} from ${deviceName}`
          );
          if (navigator.onLine) {
            try {
              await DatabaseService.logActivity(
                user.id,
                "FAILED_LOGIN",
                `Failed biometric attempt #${newFailedAttempts} from ${deviceName}`
              );
            } catch (error) {
              console.log("Failed to log to server (offline)");
            }
          }

          throw new Error(
            `Biometric authentication failed. ${remaining} attempts remaining.`
          );
        }
      },

      setUnlockMethod(method) {
        set({ unlockMethod: method });
      },

      updateUserProfile(updates) {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      async checkNewDevice() {
        const { user } = get();
        if (!user) return false;

        let storedDeviceId = localStorage.getItem("hushkey_device_id");

        if (!storedDeviceId) {
          storedDeviceId = EncryptionService.generateRandomString();
          localStorage.setItem("hushkey_device_id", storedDeviceId);
          set({ deviceId: storedDeviceId });

          // Register device
          const deviceName = navigator.userAgent.substring(0, 50);
          await DatabaseService.saveDevice(user.id, storedDeviceId, deviceName);
          await IndexedDBService.saveDevice(
            user.id,
            storedDeviceId,
            deviceName
          );

          // Log new device
          await DatabaseService.logActivity(
            user.id,
            "SECURITY",
            "New device login detected"
          );
          await IndexedDBService.logActivity(
            user.id,
            "SECURITY",
            "New device login detected"
          );

          return true;
        } else {
          set({ deviceId: storedDeviceId });
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

      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },

      async hydrate() {
        const state = get();

        // 1. Validate Supabase Session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session || !session.user) {
          // No active session or expired
          if (state.user) {
            set({
              user: null,
              masterKey: null,
              wrappedMasterKey: null,
              isUnlocked: false,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
          return;
        }

        // 2. Refresh User Data if needed (keep existing if matching)
        if (!state.user || state.user.id !== session.user.id) {
          // Check if profile exists; if not, create it (Fix for OAuth/Email Confirm)
          let profileHasPin = false;
          let biometricEnabled = false;
          try {
            let profile = await DatabaseService.getUserProfile(session.user.id);
            if (!profile) {
              const salt = EncryptionService.generateSalt();
              await DatabaseService.createUserProfile(session.user.id, salt);
              await IndexedDBService.saveUserProfile(session.user.id, salt);

              const defaultSettings = {
                auto_lock_minutes: 5,
                clipboard_clear_seconds: 30,
                theme: "dark",
                allow_screenshots: false,
              };
              await DatabaseService.saveUserSettings(
                session.user.id,
                defaultSettings
              );

              // Create device entry
              const deviceId = EncryptionService.generateRandomString();
              const deviceName = navigator.userAgent.substring(0, 50);
              await DatabaseService.saveDevice(
                session.user.id,
                deviceId,
                deviceName
              );
              await IndexedDBService.saveDevice(
                session.user.id,
                deviceId,
                deviceName
              );

              set({ deviceId });
              profileHasPin = false;
            } else {
              // Profile exists, check if PIN is set
              profileHasPin = !!profile.pin_verification;
            }

            // Load biometric preference from settings (try cache first, then server)
            let settings = await IndexedDBService.getSettings(session.user.id);
            if (!settings && navigator.onLine) {
              try {
                settings = await DatabaseService.getUserSettings(session.user.id);
                if (settings) {
                  await IndexedDBService.saveSettings(session.user.id, settings);
                }
              } catch (error) {
                console.log("Failed to load settings from server");
              }
            }
            biometricEnabled = settings?.biometric_enabled || false;
          } catch (err) {
            console.error("Hydrate: Error ensuring profile exists:", err);
          }

          // Determine if user needs onboarding
          const needsOnboarding =
            !profileHasPin && state.onboardingStep === null;

          set({
            user: { id: session.user.id, email: session.user.email! },
            isLoading: false,
            hasPinSet: profileHasPin,
            biometricEnabled,
            // Trigger onboarding for new users without PIN
            onboardingStep: needsOnboarding ? 0 : state.onboardingStep,
            // Reset security state on user mismatch
            masterKey: null,
            wrappedMasterKey: null,
            isUnlocked: false,
          });
          return;
        }

        // 3. Handle Auto-Lock & Key Restoration
        if (state.isUnlocked && state.wrappedMasterKey) {
          const timeSince = Date.now() - state.lastActivity;
          const autoLockMs = state.autoLockMinutes * 60 * 1000;

          if (timeSince > autoLockMs) {
            get().lock();
          } else {
            // Attempt to restore master key
            try {
              const masterKey = await SecureMemoryService.unwrapMasterKey(
                state.wrappedMasterKey
              );
              await IntegrityCheckerService.initialize(masterKey);
              IndexedDBService.setMasterKey(masterKey);

              // Restore memory state
              set({ masterKey, isLoading: false });
            } catch (error) {
              console.warn("Failed to restore master key on hydration:", error);
              get().lock();
            }
          }
        } else {
          // Not unlocked or missing key data
          if (state.isUnlocked) {
            // Inconsistent state
            get().lock();
          }
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
        unlockMethod: state.unlockMethod,
        lastActivity: state.lastActivity,
        autoLockMinutes: state.autoLockMinutes,
        hasPinSet: state.hasPinSet,
        biometricEnabled: state.biometricEnabled,
        onboardingStep: state.onboardingStep,
      }),
    }
  )
);
