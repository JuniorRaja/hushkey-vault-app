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
  encryptedPinKey: string | null;
  pinSalt: string | null;
  isUnlocked: boolean;
  deviceId: string;
  unlockMethod: "pin" | "biometric" | "password";
  failedAttempts: number;
  lastActivity: number;
  autoLockMinutes: number;
}

interface AuthActions {
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: "google" | "github") => Promise<void>;
  signOut: () => Promise<void>;
  lock: () => void;
  setupMasterPin: (pin: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<void>;
  setUnlockMethod: (method: "pin" | "biometric" | "password") => void;
  updateUserProfile: (updates: Partial<User>) => void;
  checkNewDevice: () => Promise<boolean>;
  logActivity: (action: string, details: string) => Promise<void>;
  updateActivity: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      masterKey: null,
      wrappedMasterKey: null,
      encryptedPinKey: null,
      pinSalt: null,
      isUnlocked: false,
      deviceId: "",
      unlockMethod: "password",
      failedAttempts: 0,
      lastActivity: Date.now(),
      autoLockMinutes: 5,

      async signUp(email: string, password: string) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        if (!data.user) throw new Error("Signup failed");

        if (!data.session) {
          throw new Error(
            "Please check your email to confirm your account before logging in"
          );
        }

        console.log("Signup successful, creating profile...");

        try {
          // 1. Create user profile with salt
          const salt = EncryptionService.generateSalt();
          await DatabaseService.createUserProfile(data.user.id, salt);
          await IndexedDBService.saveUserProfile(data.user.id, salt);
          console.log("Profile created");

          // 2. Create default settings
          const defaultSettings = {
            auto_lock_minutes: 5,
            clipboard_clear_seconds: 30,
            theme: "dark",
            allow_screenshots: false,
          };
          await DatabaseService.saveUserSettings(data.user.id, defaultSettings);
          await IndexedDBService.saveSettings(data.user.id, defaultSettings);
          console.log("Settings created");

          // 3. Register device
          const deviceId = EncryptionService.generateRandomString();
          const deviceName = navigator.userAgent.substring(0, 50);
          await DatabaseService.saveDevice(data.user.id, deviceId, deviceName);
          await IndexedDBService.saveDevice(data.user.id, deviceId, deviceName);
          console.log("Device registered:", deviceId);

          // 4. Log signup event
          await DatabaseService.logActivity(data.user.id, "SIGNUP", "User account created");
          await IndexedDBService.logActivity(data.user.id, "SIGNUP", "User account created");
          console.log("Activity logged");

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

        // Log signin event with session details
        const deviceName = navigator.userAgent.substring(0, 50);
        await DatabaseService.logActivity(data.user.id, "LOGIN", `User signed in from ${deviceName}`);
        await IndexedDBService.logActivity(data.user.id, "LOGIN", `User signed in from ${deviceName}`);

        // Load settings from Supabase and cache in IndexedDB
        const settings = await DatabaseService.getUserSettings(data.user.id);
        if (settings) {
          await IndexedDBService.saveSettings(data.user.id, settings);
        }

        set({
          user: { id: data.user.id, email: data.user.email! },
          isLoading: false,
          isUnlocked: false,
          autoLockMinutes: settings?.auto_lock_minutes ?? 5,
        });
      },

      async signInWithOAuth(provider: "google" | "github") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: import.meta.env.VITE_APP_URL || window.location.origin,
          },
        });

        if (error) throw error;
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
        
        if (user) {
          await DatabaseService.logActivity(user.id, "LOGOUT", "User signed out");
          await IndexedDBService.logActivity(user.id, "LOGOUT", "User signed out");
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
        
        if (user) {
          await DatabaseService.logActivity(user.id, "LOCK", "Vault locked");
          await IndexedDBService.logActivity(user.id, "LOCK", "Vault locked");
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

        // Get or create profile
        let profile = await DatabaseService.getUserProfile(user.id);
        let salt = profile?.salt;

        if (!salt) {
          salt = EncryptionService.generateSalt();
          await DatabaseService.saveUserProfile(user.id, salt);
          await IndexedDBService.saveUserProfile(user.id, salt);
        }

        // Derive master key from PIN
        const masterKey = await EncryptionService.deriveMasterKey(pin, salt);

        // Wrap master key for secure storage
        await SecureMemoryService.initializeWrappingKey();
        const wrappedMasterKey = await SecureMemoryService.wrapMasterKey(masterKey);

        // Encrypt master key with PIN (legacy support)
        const pinSalt = EncryptionService.generateSalt();
        const pinKey = await EncryptionService.deriveMasterKey(pin, pinSalt);
        const masterKeyBase64 = EncryptionService.toBase64(masterKey);
        const encryptedPinKey = await EncryptionService.encrypt(
          masterKeyBase64,
          pinKey
        );

        // Initialize integrity checker
        await IntegrityCheckerService.initialize(masterKey);

        // Get or create settings
        let settings = await DatabaseService.getUserSettings(user.id);
        if (!settings) {
          const defaultSettings = {
            auto_lock_minutes: 5,
            clipboard_clear_seconds: 30,
            theme: "dark",
            allow_screenshots: false,
          };
          await DatabaseService.saveUserSettings(user.id, defaultSettings);
          await IndexedDBService.saveSettings(user.id, defaultSettings);
          settings = defaultSettings;
        }

        // Load user name
        const userName = await DatabaseService.getUserProfileName(user.id, masterKey);

        SoundService.playLockSound();
        
        set({ 
          masterKey,
          wrappedMasterKey,
          encryptedPinKey, 
          pinSalt, 
          isUnlocked: true, 
          lastActivity: Date.now(),
          autoLockMinutes: settings?.auto_lock_minutes ?? 5,
          user: userName ? { ...user, name: userName } : user,
        });

        // Log PIN creation
        await DatabaseService.logActivity(user.id, "CREATE", "Master PIN created");
        await IndexedDBService.logActivity(user.id, "CREATE", "Master PIN created");
        
        // Check and register device
        await get().checkNewDevice();
        
        // Load items after successful unlock
        const { useItemStore } = await import('./itemStore');
        useItemStore.getState().loadItems();
      },

      async unlockWithPin(pin: string) {
        const { encryptedPinKey, pinSalt, user } = get();
        if (!encryptedPinKey || !pinSalt || !user) throw new Error("PIN not set");

        // Check rate limiting
        const rateLimitCheck = RateLimiterService.canAttempt(user.id);
        if (!rateLimitCheck.allowed) {
          throw new Error(rateLimitCheck.reason || "Too many attempts");
        }

        try {
          const pinKey = await EncryptionService.deriveMasterKey(pin, pinSalt);
          const masterKeyBase64 = await EncryptionService.decrypt(
            encryptedPinKey,
            pinKey
          );
          const masterKey = EncryptionService.fromBase64(masterKeyBase64);

          // Initialize secure memory and integrity checker
          await SecureMemoryService.initializeWrappingKey();
          await IntegrityCheckerService.initialize(masterKey);

          // Wrap master key for secure storage
          const wrappedMasterKey = await SecureMemoryService.wrapMasterKey(masterKey);

          // Load settings from Supabase and cache
          const settings = await DatabaseService.getUserSettings(user.id);
          if (settings) {
            await IndexedDBService.saveSettings(user.id, settings);
          }

          // Load user name
          const userName = await DatabaseService.getUserProfileName(user.id, masterKey);

          // Record successful attempt
          RateLimiterService.recordSuccessfulAttempt(user.id);

          SoundService.playLockSound();

          set({ 
            masterKey,
            wrappedMasterKey,
            isUnlocked: true, 
            failedAttempts: 0, 
            lastActivity: Date.now(),
            autoLockMinutes: settings?.auto_lock_minutes ?? 5,
            user: userName ? { ...user, name: userName } : user,
          });
          
          // Log unlock with session details
          const deviceName = navigator.userAgent.substring(0, 50);
          await DatabaseService.logActivity(user.id, "LOGIN", `Vault unlocked via PIN from ${deviceName}`);
          await IndexedDBService.logActivity(user.id, "LOGIN", `Vault unlocked via PIN from ${deviceName}`);
          
          // Check and update device
          await get().checkNewDevice();
          
          // Load items after successful unlock
          const { useItemStore } = await import('./itemStore');
          useItemStore.getState().loadItems();
        } catch (error) {
          // Record failed attempt
          RateLimiterService.recordFailedAttempt(user.id);
          
          const newFailedAttempts = get().failedAttempts + 1;
          const remaining = RateLimiterService.getRemainingAttempts(user.id);
          set({ failedAttempts: newFailedAttempts });
          
          // Log failed attempt with session details
          const deviceName = navigator.userAgent.substring(0, 50);
          await DatabaseService.logActivity(user.id, "FAILED_LOGIN", `Failed PIN attempt #${newFailedAttempts} from ${deviceName}`);
          await IndexedDBService.logActivity(user.id, "FAILED_LOGIN", `Failed PIN attempt #${newFailedAttempts} from ${deviceName}`);
          
          throw new Error(`Invalid PIN. ${remaining} attempts remaining.`);
        }
      },

      async unlockWithBiometrics() {
        const { user, encryptedPinKey, pinSalt } = get();
        if (!user) throw new Error("No user logged in");
        if (!encryptedPinKey || !pinSalt) throw new Error("PIN not set");

        const authenticated = await BiometricService.authenticate(user.id);
        if (!authenticated) throw new Error("Biometric authentication failed");

        // Retrieve master key from secure storage
        const { wrappedMasterKey } = get();
        if (!wrappedMasterKey) throw new Error("Master key not found");

        const masterKey = await SecureMemoryService.unwrapMasterKey(wrappedMasterKey);
        await IntegrityCheckerService.initialize(masterKey);

        const settings = await DatabaseService.getUserSettings(user.id);
        if (settings) await IndexedDBService.saveSettings(user.id, settings);

        SoundService.playLockSound();

        set({ 
          masterKey,
          isUnlocked: true, 
          failedAttempts: 0, 
          lastActivity: Date.now(),
          autoLockMinutes: settings?.auto_lock_minutes ?? 5,
        });
        
        await DatabaseService.logActivity(user.id, "LOGIN", "Vault unlocked via biometrics");
        await IndexedDBService.logActivity(user.id, "LOGIN", "Vault unlocked via biometrics");
        await get().checkNewDevice();
        
        // Load items after successful unlock
        const { useItemStore } = await import('./itemStore');
        useItemStore.getState().loadItems();
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
          await IndexedDBService.saveDevice(user.id, storedDeviceId, deviceName);
          
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
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const settings = await DatabaseService.getUserSettings(user.id);
            set({
              user: { id: user.id, email: user.email! },
              autoLockMinutes: settings?.auto_lock_minutes ?? 5,
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error("Hydration error:", error);
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "hushkey-auth",
      partialize: (state) => ({
        user: state.user,
        wrappedMasterKey: state.wrappedMasterKey,
        encryptedPinKey: state.encryptedPinKey,
        pinSalt: state.pinSalt,
        deviceId: state.deviceId,
        unlockMethod: state.unlockMethod,
        lastActivity: state.lastActivity,
        autoLockMinutes: state.autoLockMinutes,
      }),
    }
  )
);
