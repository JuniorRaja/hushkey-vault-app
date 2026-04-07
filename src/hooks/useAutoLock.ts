import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth";

export const useAutoLock = () => {
  const navigate = useNavigate();
  const { lock, isUnlocked, lastActivity, updateActivity, autoLockMinutes } = useAuthStore();
  const isLockingRef = useRef(false);
  const lastActivityRef = useRef(lastActivity);
  useEffect(() => { lastActivityRef.current = lastActivity; }, [lastActivity]);

  useEffect(() => {
    if (!isUnlocked || autoLockMinutes <= 0) return;

    const checkAndLock = async () => {
      if (isLockingRef.current) return;

      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= autoLockMinutes * 60 * 1000) {
        isLockingRef.current = true;
        try {
          await lock();
          navigate("/", { replace: true });
        } finally {
          isLockingRef.current = false;
        }
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
  }, [isUnlocked, autoLockMinutes, lock, navigate, updateActivity]);
};
