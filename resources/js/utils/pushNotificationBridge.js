/**
 * Relays service worker push messages to the running app.
 *
 * `public/sw.js` posts a message to every open page when a Web Push arrives (and
 * when a push banner is clicked into an already-open tab). A push is delivered
 * precisely when the page may have been asleep long enough for Echo's websocket
 * to have dropped, so the push -- not Echo -- is the only signal an open tab
 * gets about that notification. Subscribers use it to re-fetch their state.
 *
 * The `message` listener is attached once per page, not once per subscriber, so
 * mounting several notification-aware components does not multiply the work.
 */

export const PUSH_MESSAGE_TYPES = ["push-notification", "notification-click"];

const subscribers = new Set();

let listening = false;

const handleMessage = (event) => {
    const payload = event?.data;
    if (!payload || !PUSH_MESSAGE_TYPES.includes(payload.type)) {
        return;
    }

    subscribers.forEach((callback) => {
        try {
            callback(payload);
        } catch (error) {
            console.error("Push notification subscriber failed:", error);
        }
    });
};

const startListening = () => {
    if (listening) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
        return;
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    listening = true;
};

/**
 * Run `callback` whenever the service worker reports a push.
 *
 * @param {(payload: {type: string, notification?: object}) => void} callback
 * @returns {() => void} unsubscribe
 */
export function onPushNotification(callback) {
    if (typeof callback !== "function") {
        return () => {};
    }

    startListening();
    subscribers.add(callback);

    return () => {
        subscribers.delete(callback);
    };
}

/**
 * Test helper: drop every subscriber and detach the listener.
 */
export function resetPushNotificationBridge() {
    subscribers.clear();
    if (listening && typeof navigator !== "undefined") {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
    }
    listening = false;
}
