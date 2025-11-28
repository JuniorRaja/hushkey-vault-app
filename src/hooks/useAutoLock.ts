import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export const useAutoLock = () => {
  const navigate = useNavigate();
  const { lock, isUnlocked, lastActivity, updateActivity, autoLockMinutes } = useAuthStore();

  useEffect(() => {
    if (!isUnlocked || autoLockMinutes <= 0) return;

    const checkAndLock = () => {
      const elapsed = Date.now() - lastActivity;
      if (elapsed >= autoLockMinutes * 60 * 1000) {
        lock();
        navigate("/login", { replace: true });
      }
    };

    const interval = setInterval(checkAndLock, 10000);

    const handleActivity = () => updateActivity();
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, handleActivity));

    return () => {
      clearInterval(interval);
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [isUnlocked, autoLockMinutes, lastActivity, lock, navigate, updateActivity]);
};
