import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

const PWAUpdater = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered: " + r);
      if (r) {
        // Check for updates every 3 hours
        setInterval(() => {
          console.log("Checking for SW update...");
          r.update();
        }, 3 * 60 * 60 * 1000); // 3 hours
      }
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!needRefresh) {
    // If it's just offline ready (first install), we don't need to annoy the user.
    // The requirement is: "The app should not prompt to update at the very first instance of the app."
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 flex items-center gap-4 max-w-sm">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-white">App Updated</h3>
          <p className="text-xs text-gray-400 mt-1">
            A new version is available. Reload to update.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
          >
            Reload
          </button>
          <button
            onClick={close}
            className="px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdater;
