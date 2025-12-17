import React, { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "../src/stores/authStore";
import DatabaseService from "../src/services/database";

/**
 * ScreenshotProtection Component
 *
 * Provides screenshot/screen capture protection for PWA.
 * When allowScreenshots is disabled:
 * - Prevents text selection on sensitive content
 * - Shows a privacy overlay when app loses focus (including app switcher)
 * - Applies CSS-based protection measures
 *
 * LIMITATIONS (Web/PWA):
 * - True screenshot blocking (like Android's FLAG_SECURE) is NOT possible in web
 * - No PWA manifest option exists for screenshot prevention
 * - App switcher thumbnails may be captured before overlay appears on some devices
 * - This provides best-effort protection for web/PWA environments
 *
 * For complete screenshot blocking, a native app wrapper (Capacitor/Cordova) is needed
 * with native plugins that can set FLAG_SECURE on Android.
 */
const ScreenshotProtection: React.FC = () => {
  const { user, isUnlocked } = useAuthStore();
  const [allowScreenshots, setAllowScreenshots] = useState(true);
  const [isHidden, setIsHidden] = useState(false);

  // Load screenshot setting from database
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      try {
        const settings = await DatabaseService.getUserSettings(user.id);
        setAllowScreenshots(settings?.allow_screenshots ?? false);
      } catch (error) {
        console.error("Failed to load screenshot settings:", error);
      }
    };

    loadSettings();

    // Listen for settings changes
    const handleSettingsChange = (event: CustomEvent) => {
      if (event.detail?.allow_screenshots !== undefined) {
        setAllowScreenshots(event.detail.allow_screenshots);
      }
    };

    window.addEventListener(
      "screenshotSettingChanged",
      handleSettingsChange as EventListener
    );
    return () => {
      window.removeEventListener(
        "screenshotSettingChanged",
        handleSettingsChange as EventListener
      );
    };
  }, [user]);

  // Memoized handlers for better performance
  const showOverlay = useCallback(() => {
    setIsHidden(true);
  }, []);

  const hideOverlay = useCallback(() => {
    // Delay before removing overlay to prevent flash captures
    setTimeout(() => setIsHidden(false), 150);
  }, []);

  // Handle visibility change - show overlay when app is hidden
  useEffect(() => {
    if (allowScreenshots) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        showOverlay();
      } else {
        hideOverlay();
      }
    };

    // Page Lifecycle API - better for mobile app switcher detection
    const handlePageHide = () => {
      showOverlay();
    };

    const handlePageShow = () => {
      hideOverlay();
    };

    // Freeze event - fires when page is being frozen (app switcher on some browsers)
    const handleFreeze = () => {
      showOverlay();
    };

    const handleResume = () => {
      hideOverlay();
    };

    // Standard blur/focus for desktop and fallback
    const handleBlur = () => {
      showOverlay();
    };

    const handleFocus = () => {
      hideOverlay();
    };

    // Touch-based detection for mobile - detect when user starts gesture to switch apps
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchY = e.touches[0].clientY;
      const screenHeight = window.innerHeight;
      // Detect swipe up from bottom (common gesture to open app switcher)
      if (touchStartY > screenHeight * 0.9 && touchY < touchStartY - 50) {
        showOverlay();
      }
    };

    // Register all event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    // Page Lifecycle API (if supported)
    if ("onfreeze" in document) {
      document.addEventListener("freeze", handleFreeze);
      document.addEventListener("resume", handleResume);
    }

    // Touch events for mobile gesture detection
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);

      if ("onfreeze" in document) {
        document.removeEventListener("freeze", handleFreeze);
        document.removeEventListener("resume", handleResume);
      }

      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [allowScreenshots, showOverlay, hideOverlay]);

  // Apply CSS protection when screenshots are disabled
  useEffect(() => {
    if (!isUnlocked) return;

    const root = document.documentElement;

    if (!allowScreenshots) {
      // Prevent text selection on body
      root.style.setProperty("--screenshot-protection", "none");
      document.body.classList.add("screenshot-protected");
    } else {
      root.style.removeProperty("--screenshot-protection");
      document.body.classList.remove("screenshot-protected");
    }

    return () => {
      root.style.removeProperty("--screenshot-protection");
      document.body.classList.remove("screenshot-protected");
    };
  }, [allowScreenshots, isUnlocked]);

  // Don't render anything if screenshots are allowed or user not unlocked
  if (allowScreenshots || !isUnlocked) return null;

  // Privacy overlay when app loses focus
  if (isHidden) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-gray-950 flex items-center justify-center"
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <p className="text-gray-400 text-sm font-medium">Content Protected</p>
          <p className="text-gray-600 text-xs mt-1">Return to view your vault</p>
        </div>
      </div>
    );
  }

  return null;
};

export default ScreenshotProtection;
