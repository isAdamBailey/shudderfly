import axios from "axios";
import { onMounted, ref } from "vue";

export function usePushNotifications() {
  const isSupported = ref(false);
  const isSubscribed = ref(false);
  const subscription = ref(null);
  const registration = ref(null);

  // Check if browser supports push notifications
  const checkSupport = () => {
    isSupported.value = "serviceWorker" in navigator && "PushManager" in window;
    return isSupported.value;
  };

  // Check support immediately (synchronous)
  checkSupport();

  // Register service worker
  const registerServiceWorker = async () => {
    if (!checkSupport()) {
      return false;
    }

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      registration.value = reg;
      return true;
    } catch (error) {
      return false;
    }
  };

  // Request notification permission
  const requestPermission = async () => {
    if (!("Notification" in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  };

  // Subscribe to push notifications
  const subscribe = async () => {
    if (!registration.value) {
      const registered = await registerServiceWorker();
      if (!registered) return false;
    }

    const permissionGranted = await requestPermission();
    if (!permissionGranted) {
      return false;
    }

    // Check if VAPID key is configured
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey || vapidKey.trim() === "") {
      throw new Error(
        "Push notification key is not configured. Please set VITE_VAPID_PUBLIC_KEY in your .env file."
      );
    }

    // Validate key format
    const trimmedKey = vapidKey.trim();
    if (trimmedKey.length < 80 || trimmedKey.length > 200) {
      throw new Error(
        `Invalid VAPID key length (${trimmedKey.length} chars). Expected 80-200 characters. Make sure you generated the key correctly using 'npx web-push generate-vapid-keys'.`
      );
    }

    let applicationServerKey;
    try {
      applicationServerKey = urlBase64ToUint8Array(trimmedKey);

      // Validate the key is the correct length (65 bytes for P-256 public key)
      if (applicationServerKey.length !== 65) {
        throw new Error(
          `Invalid VAPID key format. Expected 65 bytes after conversion, got ${applicationServerKey.length}. Make sure you're using the PUBLIC key (not private) from 'npx web-push generate-vapid-keys'.`
        );
      }
    } catch (error) {
      throw new Error(
        `Invalid VAPID public key format: ${error.message}. Make sure you're using the public key from 'npx web-push generate-vapid-keys' and it's in base64url format (no spaces, no newlines).`
      );
    }

    try {
      const sub = await registration.value.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // Validate that both keys exist
      const p256dhKey = sub.getKey("p256dh");
      const authKey = sub.getKey("auth");

      if (!p256dhKey || !authKey) {
        // Unsubscribe from browser if keys are missing
        await sub.unsubscribe();
        throw new Error(
          "Push subscription keys are missing. Please try subscribing again."
        );
      }

      // Send subscription to backend before storing locally
      // If backend fails, we'll rollback the browser subscription
      try {
        await axios.post("/api/push/subscribe", {
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(p256dhKey),
            auth: arrayBufferToBase64(authKey)
          }
        });
      } catch (backendError) {
        // Backend failed - rollback browser subscription
        await sub.unsubscribe();
        throw new Error(
          "Failed to save subscription to server. Please try again."
        );
      }

      // Only store subscription locally after backend succeeds
      subscription.value = sub;
      isSubscribed.value = true;
      return true;
    } catch (error) {
      // Log the error for debugging (optional)
      console.error("Push subscription error:", error);
      throw error;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!subscription.value) {
      // Try to get existing subscription
      if (registration.value) {
        const sub = await registration.value.pushManager.getSubscription();
        if (sub) {
          subscription.value = sub;
        }
      }
    }

    if (subscription.value) {
      const endpoint = subscription.value.endpoint;
      const sub = subscription.value;
      try {
        // First, unsubscribe from browser
        // If this fails, we don't modify backend, keeping state consistent
        await sub.unsubscribe();

        // Only delete from backend if browser unsubscribe succeeds
        try {
          await axios.post("/api/push/unsubscribe", {
            endpoint: endpoint
          });
        } catch (backendError) {
          // Backend deletion failed, but browser is already unsubscribed
          // The subscription will be cleaned up on next sync or when user re-subscribes
        }

        subscription.value = null;
        isSubscribed.value = false;
        return true;
      } catch (error) {
        // Browser unsubscribe failed - check if subscription still exists
        if (registration.value) {
          try {
            const currentSub =
              await registration.value.pushManager.getSubscription();
            if (currentSub && currentSub.endpoint === endpoint) {
              // Subscription still exists, restore state
              subscription.value = currentSub;
              isSubscribed.value = true;
            } else {
              // Subscription was removed, clear state
              subscription.value = null;
              isSubscribed.value = false;
            }
          } catch (checkError) {
            // Can't check subscription, clear state
            subscription.value = null;
            isSubscribed.value = false;
          }
        }
        return false;
      }
    }

    return false;
  };

  // Check current subscription status
  const checkSubscription = async () => {
    if (!registration.value) {
      const registered = await registerServiceWorker();
      if (!registered) return;
    }

    try {
      const sub = await registration.value.pushManager.getSubscription();
      subscription.value = sub;
      isSubscribed.value = !!sub;
    } catch (error) {
      // Silently fail
    }
  };

  // Helper: Convert VAPID key from base64 URL to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    if (!base64String || typeof base64String !== "string") {
      throw new Error("VAPID public key must be a non-empty string");
    }

    try {
      const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (error) {
      throw new Error(`Invalid VAPID public key format: ${error.message}`);
    }
  };

  // Helper: Convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Initialize on mount
  onMounted(async () => {
    if (checkSupport()) {
      await registerServiceWorker();
      await checkSubscription();
    }
  });

  return {
    isSupported,
    isSubscribed,
    subscribe,
    unsubscribe
  };
}
