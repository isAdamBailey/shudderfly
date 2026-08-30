/**
 * The page-level "your notifications may have changed" signal.
 *
 * Two things tell a running page that the server knows about a notification it
 * does not:
 *
 * - the service worker, which posts a message when a Web Push arrives (and when
 *   a push banner is clicked into an already-open tab); and
 * - the page becoming visible again, because on mobile the tab is usually
 *   frozen when the push lands, so that message is never delivered and
 *   returning to the app is the first moment the page can act on it.
 *
 * Both are page-wide facts, so both listeners are attached once here and fanned
 * out, rather than once per component that cares.
 */

const SERVICE_WORKER_MESSAGES = {
    "push-notification": "push",
    "notification-click": "click",
};

const subscribers = new Set();

let listening = false;

const emit = (reason) => {
    subscribers.forEach((callback) => {
        try {
            callback(reason);
        } catch (error) {
            console.error("Notification refresh subscriber failed:", error);
        }
    });
};

const handleServiceWorkerMessage = (event) => {
    const reason = SERVICE_WORKER_MESSAGES[event?.data?.type];
    if (reason) {
        emit(reason);
    }
};

const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
        emit("visible");
    }
};

const startListening = () => {
    if (listening) return;
    listening = true;

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener(
            "message",
            handleServiceWorkerMessage
        );
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
};

const stopListening = () => {
    if (!listening) return;
    listening = false;

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
            "message",
            handleServiceWorkerMessage
        );
    }
    document.removeEventListener("visibilitychange", handleVisibilityChange);
};

/**
 * Run `callback("push" | "click" | "visible")` when notifications may have
 * changed. Returns an unsubscribe function.
 */
export function onNotificationRefresh(callback) {
    startListening();
    subscribers.add(callback);

    return () => {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
            stopListening();
        }
    };
}
