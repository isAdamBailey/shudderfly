import _ from "lodash";
window._ = _;

/**
 * We'll load the axios HTTP library which allows us to easily issue requests
 * to our Laravel back-end. This library automatically handles sending the
 * CSRF token as a header based on the value of the "XSRF" token cookie.
 */

import axios from "axios";
window.axios = axios;

window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
window.axios.defaults.withCredentials = true;

/**
 * Echo exposes an expressive API for subscribing to channels and listening
 * for events that are broadcast by Laravel. Echo and event broadcasting
 * allows your team to easily build robust real-time web applications.
 */

// Only initialize Pusher/Echo if the required environment variables are set
if (import.meta.env.VITE_PUSHER_APP_KEY) {
  import("laravel-echo").then((EchoModule) => {
    import("pusher-js").then((PusherModule) => {
      window.Pusher = PusherModule.default;

      window.Echo = new EchoModule.default({
        broadcaster: "pusher",
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        wsHost: import.meta.env.VITE_PUSHER_HOST
          ? import.meta.env.VITE_PUSHER_HOST
          : `ws-${import.meta.env.VITE_PUSHER_APP_CLUSTER || "mt1"}.pusher.com`,
        wsPort: import.meta.env.VITE_PUSHER_PORT ?? 80,
        wssPort: import.meta.env.VITE_PUSHER_PORT ?? 443,
        forceTLS: (import.meta.env.VITE_PUSHER_SCHEME ?? "https") === "https",
        enabledTransports: ["ws", "wss"]
      });
    });
  });
}
