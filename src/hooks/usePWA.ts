import { useEffect, useState } from 'react';
import { requestNotificationPermission, sendPushNotification, playSound } from '../services/pwa';

export const usePWA = () => {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);
  }, []);

  const requestPermissions = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  };

  return {
    notificationPermission,
    isInstalled,
    requestPermissions,
    sendPushNotification,
    playSound
  };
};
