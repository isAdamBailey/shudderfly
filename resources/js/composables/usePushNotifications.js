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

  // Register service worker
  const registerServiceWorker = async () => {
    if (!checkSupport()) {
      console.warn("Push notifications are not supported in this browser");
      return false;
    }

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      registration.value = reg;
      console.log("Service Worker registered");
      return true;
    } catch (error) {
      console.error("Service Worker registration failed:", error);
      return false;
    }
  };

  // Request notification permission
  const requestPermission = async () => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
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
      console.warn("Notification permission denied");
      return false;
    }

    try {
      const sub = await registration.value.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY
        )
      });

      subscription.value = sub;

      // Send subscription to backend
      await axios.post("/api/push/subscribe", {
        endpoint: sub.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(sub.getKey("p256dh")),
          auth: arrayBufferToBase64(sub.getKey("auth"))
        }
      });

      isSubscribed.value = true;
      console.log("Subscribed to push notifications");
      return true;
    } catch (error) {
      console.error("Subscription failed:", error);
      return false;
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
      try {
        await subscription.value.unsubscribe();
        await axios.post("/api/push/unsubscribe", {
          endpoint: subscription.value.endpoint
        });
        subscription.value = null;
        isSubscribed.value = false;
        console.log("Unsubscribed from push notifications");
        return true;
      } catch (error) {
        console.error("Unsubscription failed:", error);
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
      console.error("Error checking subscription:", error);
    }
  };

  // Helper: Convert VAPID key from base64 URL to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
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
    unsubscribe,
    checkSubscription
  };
}
