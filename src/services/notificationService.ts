import { supabase } from "../supabaseClient";
import DatabaseService from "./database";
import { AppNotification, NotificationType, AppSettings } from "../../types";
import { storageService } from "../../services/storage";
import { sendPushNotification } from "./pwa";

class NotificationService {
  /**
   * Send a notification (In-App, Push, and Email if critical)
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    settings: AppSettings["notifications"]
  ): Promise<AppNotification | null> {
    // 1. Check Settings
    let configKey: keyof AppSettings["notifications"] | undefined;

    // Map types to settings keys
    if (type === NotificationType.SECURITY) {
      if (title.toLowerCase().includes("new device"))
        configKey = "newDeviceLogin";
      else if (title.toLowerCase().includes("failed login"))
        configKey = "failedLoginAttempts";
      else if (title.toLowerCase().includes("weak password"))
        configKey = "weakPasswordAlerts";
    } else if (type === NotificationType.ALERT) {
      // e.g., Expiry
      if (title.toLowerCase().includes("expiry")) configKey = "expiryReminders";
    }

    // 2. Persist to DB (In-App) - Always persist if it's a notification, or maybe filter?
    // Usually In-App history is good to have even if alerts are off.
    // We will proceed to save it.

    let notification: AppNotification | null = null;
    try {
      notification = await DatabaseService.createNotification(userId, {
        type,
        title,
        message,
        read: false,
      });
    } catch (err) {
      console.error("Failed to save notification:", err);
    }

    // Check if we should alert (Push/Email)
    // If specific config is FALSE, we skip alerts.
    // If configKey is undefined, we assume it's a general alert and respect master toggle?
    // Or default to true? Let's default to respecting master toggle if no specific key.
    const isCategoryEnabled = configKey ? settings[configKey] !== false : true;

    if (!isCategoryEnabled) {
      return notification; // Stop here, no push/email
    }

    // 3. Push Notification (PWA)
    if (settings.pushNotifications) {
      sendPushNotification(title, { body: message });
    }

    // 4. Email Notification (Edge Function)
    if (
      settings.emailNotifications &&
      (type === NotificationType.SECURITY || type === NotificationType.ALERT)
    ) {
      await this.sendEmail(userId, title, message);
    }

    return notification;
  }

  /**
   * Invoke Supabase Edge Function to send email
   */
  private async sendEmail(userId: string, subject: string, body: string) {
    try {
      const user = storageService.getUser(); // Or fetch from DB if local not available
      if (!user || !user.email) return;

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: user.email,
          subject: subject,
          html: `<p>${body}</p><br/><small>Hushkey Vault Security Alert</small>`,
        },
      });

      if (error) {
        console.error("Failed to send email:", error);
      } else {
        console.log("Email sent successfully via Edge Function");
      }
    } catch (err) {
      console.error("Error invoking email function:", err);
    }
  }

  /**
   * Fetch notifications (sync with DB)
   */
  async syncNotifications(userId: string): Promise<AppNotification[]> {
    try {
      const remote = await DatabaseService.getNotifications(userId);
      // Here we could merge with local if needed, but for now we trust remote
      storageService.saveNotifications(remote); // Cache locally
      return remote;
    } catch (err) {
      console.error("Sync notifications failed:", err);
      return storageService.getNotifications(); // Fallback to local
    }
  }

  async markAsRead(userId: string, notificationId: string) {
    // Optimistic update locally?
    const current = storageService.getNotifications();
    const updated = current.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    storageService.saveNotifications(updated);

    // Update Remote
    try {
      await DatabaseService.markNotificationRead(notificationId);
    } catch (err) {
      console.error("Failed to mark read remote:", err);
    }
  }

  async clearAll(userId: string) {
    storageService.saveNotifications([]);
    try {
      await DatabaseService.clearNotifications(userId);
    } catch (err) {
      console.error("Failed to clear remote:", err);
    }
  }
}

export default new NotificationService();
