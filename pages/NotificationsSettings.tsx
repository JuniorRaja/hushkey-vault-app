import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../src/stores/authStore";
import { useData } from "../App";
import DatabaseService from "../src/services/database";
import { ChevronLeft, Bell, Mail, Shield, Lock } from "lucide-react";

const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${
      disabled ? "opacity-40 cursor-not-allowed" : ""
    } ${checked ? "bg-primary-600" : "bg-gray-700"}`}
  >
    <div
      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300 shadow-md ${
        checked ? "left-7" : "left-1"
      }`}
    />
  </button>
);

const NotificationsSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const { settings, updateSettings } = useData();
  const [userSettings, setUserSettings] = React.useState<any>(null);

  React.useEffect(() => {
    const loadSettings = async () => {
      if (!authUser) return;
      try {
        const dbSettings = await DatabaseService.getUserSettings(authUser.id);
        setUserSettings(dbSettings);
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };
    loadSettings();
  }, [authUser]);

  const saveSettingsToDB = async (newSettings: any) => {
    if (!authUser) return;
    try {
      await DatabaseService.saveUserSettings(authUser.id, newSettings);
      setUserSettings(newSettings);
    } catch (err: any) {
      alert("Error saving settings: " + err.message);
    }
  };

  const notificationKeyMap: Record<string, string> = {
    pushNotifications: "notify_push_notifications",
    emailNotifications: "notify_email_notifications",
    weakPasswordAlerts: "notify_weak_password_alerts",
    expiryReminders: "notify_expiry_reminders",
    backupHealth: "notify_backup_health",
    sharedVaultUpdates: "notify_shared_vault_updates",
    monthlyReport: "notify_monthly_report",
    newDeviceLogin: "notify_new_device_login",
    failedLoginAttempts: "notify_failed_login_attempts",
    sessionAlerts: "notify_session_alerts",
  };

  const handleNotificationChange = async (key: string, value: boolean) => {
    const dbKey = notificationKeyMap[key] || key;
    const newSettings = { ...userSettings, [dbKey]: value };
    await saveSettingsToDB(newSettings);
    updateSettings({
      ...settings,
      notifications: { ...settings.notifications, [key]: value },
    });
  };

  const pushEnabled = settings.notifications.pushNotifications;
  const emailEnabled = settings.notifications.emailNotifications;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/settings")}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-gray-400" />
        </button>
        <h1 className="text-3xl font-bold text-white">Notifications</h1>
      </div>

      {/* Push & Email Toggles */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-800">
        <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
              <Bell size={18} />
            </div>
            <div>
              <span className="text-gray-200 font-medium block">
                Push Notifications
              </span>
              <span className="text-xs text-gray-500">
                Browser/Device alerts
              </span>
            </div>
          </div>
          <ToggleSwitch
            checked={pushEnabled}
            onChange={(val) =>
              handleNotificationChange("pushNotifications", val)
            }
          />
        </div>

        <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
              <Mail size={18} />
            </div>
            <div>
              <span className="text-gray-200 font-medium block">
                Email Notifications
              </span>
              <span className="text-xs text-gray-500">
                Send to {authUser?.email}
              </span>
            </div>
          </div>
          <ToggleSwitch
            checked={emailEnabled}
            onChange={(val) =>
              handleNotificationChange("emailNotifications", val)
            }
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => {
            if (authUser) {
              import("../src/services/notificationService").then((m) => {
                m.default.sendNotification(
                  authUser.id,
                  "SECURITY" as any,
                  "Test Notification",
                  "This is a test notification from Hushkey Settings.",
                  settings.notifications
                );
                alert(
                  "Test notification sent! Check your notification bell and email (if enabled)."
                );
              });
            }
          }}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Send Test Notification
        </button>
      </div>

      {/* Application Alerts */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 flex items-center gap-2">
          <Lock size={14} /> Application Alerts
        </h3>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-800">
          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex-1 pr-4">
              <span className="text-gray-200 font-medium text-sm block mb-1">
                Weak/Reused Passwords
              </span>
              <span className="text-xs text-gray-500">
                Guardian analysis alerts for vulnerable credentials
              </span>
            </div>
            <ToggleSwitch
              checked={settings.notifications.weakPasswordAlerts}
              onChange={(val) =>
                handleNotificationChange("weakPasswordAlerts", val)
              }
              disabled={!pushEnabled}
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex-1 pr-4">
              <span className="text-gray-200 font-medium text-sm block mb-1">
                Expiry Reminders
              </span>
              <span className="text-xs text-gray-500">
                Notify before cards or IDs expire (30 days)
              </span>
            </div>
            <ToggleSwitch
              checked={settings.notifications.expiryReminders}
              onChange={(val) =>
                handleNotificationChange("expiryReminders", val)
              }
              disabled={!pushEnabled}
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex-1 pr-4">
              <span className="text-gray-200 font-medium text-sm block mb-1">
                Backup Health
              </span>
              <span className="text-xs text-gray-500">
                Alert if backup is outdated or fails
              </span>
            </div>
            <ToggleSwitch
              checked={settings.notifications.backupHealth}
              onChange={(val) => handleNotificationChange("backupHealth", val)}
              disabled={!pushEnabled}
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex-1 pr-4">
              <span className="text-gray-200 font-medium text-sm block mb-1">
                Shared Vault Updates
              </span>
              <span className="text-xs text-gray-500">
                Notify when items are changed in shared vaults
              </span>
            </div>
            <ToggleSwitch
              checked={settings.notifications.sharedVaultUpdates}
              onChange={(val) =>
                handleNotificationChange("sharedVaultUpdates", val)
              }
              disabled={!pushEnabled}
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex-1 pr-4">
              <span className="text-gray-200 font-medium text-sm block mb-1">
                Monthly Security Report
              </span>
              <span className="text-xs text-gray-500">
                Regular summary of your vault health
              </span>
            </div>
            <ToggleSwitch
              checked={settings.notifications.monthlyReport}
              onChange={(val) => handleNotificationChange("monthlyReport", val)}
              disabled={!pushEnabled}
            />
          </div>
        </div>
      </div>

      {/* Security Alerts */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 flex items-center gap-2">
          <Shield size={14} /> Security Alerts
        </h3>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-800">
          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex-1 pr-4">
              <span className="text-gray-200 font-medium text-sm block mb-1">
                New Device Login Alert
              </span>
              <span className="text-xs text-gray-500">
                When your account is accessed from a new browser
              </span>
            </div>
            <ToggleSwitch
              checked={settings.notifications.newDeviceLogin}
              onChange={(val) =>
                handleNotificationChange("newDeviceLogin", val)
              }
              disabled={!pushEnabled}
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex-1 pr-4">
              <span className="text-gray-200 font-medium text-sm block mb-1">
                Failed Login Attempts
              </span>
              <span className="text-xs text-gray-500">
                Notify on incorrect PIN or biometric failures
              </span>
            </div>
            <ToggleSwitch
              checked={settings.notifications.failedLoginAttempts}
              onChange={(val) =>
                handleNotificationChange("failedLoginAttempts", val)
              }
              disabled={!pushEnabled}
            />
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-850/50 transition-colors">
            <div className="flex-1 pr-4">
              <span className="text-gray-200 font-medium text-sm block mb-1">
                Session Monitoring
              </span>
              <span className="text-xs text-gray-500">
                Alerts for unusual session activity
              </span>
            </div>
            <ToggleSwitch
              checked={settings.notifications.sessionAlerts}
              onChange={(val) => handleNotificationChange("sessionAlerts", val)}
              disabled={!pushEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsSettings;
