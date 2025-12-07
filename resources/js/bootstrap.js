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
    import("laravel-echo")
        .then((EchoModule) => {
            import("pusher-js")
                .then((PusherModule) => {
                    window.Pusher = PusherModule.default;

                    const pusherConfig = {
                        broadcaster: "pusher",
                        key: import.meta.env.VITE_PUSHER_APP_KEY,
                        forceTLS:
                            (import.meta.env.VITE_PUSHER_SCHEME ?? "https") ===
                            "https",
                        enabledTransports: ["ws", "wss"],
                    };

                    // If using custom host, use wsHost/wsPort/wssPort
                    if (
                        import.meta.env.VITE_PUSHER_HOST &&
                        import.meta.env.VITE_PUSHER_HOST !== ""
                    ) {
                        pusherConfig.wsHost = import.meta.env.VITE_PUSHER_HOST;
                        pusherConfig.wsPort =
                            import.meta.env.VITE_PUSHER_PORT ?? 80;
                        pusherConfig.wssPort =
                            import.meta.env.VITE_PUSHER_PORT ?? 443;
                    } else {
                        // If using standard Pusher service, use cluster
                        pusherConfig.cluster =
                            import.meta.env.VITE_PUSHER_APP_CLUSTER || "mt1";
                    }

                    // Laravel Echo automatically handles CSRF via XSRF-TOKEN cookie
                    // But we can explicitly set the auth endpoint and headers if needed
                    window.Echo = new EchoModule.default({
                        ...pusherConfig,
                        authEndpoint: "/broadcasting/auth",
                        auth: {
                            headers: {
                                "X-Requested-With": "XMLHttpRequest",
                            },
                        },
                        authorizer: (channel) => {
                            return {
                                authorize: (socketId, callback) => {
                                    window.axios
                                        .post("/broadcasting/auth", {
                                            socket_id: socketId,
                                            channel_name: channel.name,
                                        })
                                        .then((response) => {
                                            callback(null, response.data);
                                        })
                                        .catch((error) => {
                                            console.error(
                                                "Broadcasting auth error:",
                                                error
                                            );
                                            console.error(
                                                "Error response:",
                                                error.response
                                            );
                                            callback(error);
                                        });
                                },
                            };
                        },
                    });

                    // Only log connection status and errors
                    if (window.Echo.connector && window.Echo.connector.pusher) {
                        window.Echo.connector.pusher.connection.bind(
                            "error",
                            function (err) {
                                console.error("Pusher connection error:", err);
                            }
                        );
                    }
                })
                .catch((error) => {
                    console.error("Failed to load pusher-js module:", error);
                    // Graceful degradation: Do not initialize window.Pusher/Echo
                });
        })
        .catch((error) => {
            console.error("Failed to load laravel-echo module:", error);
            // Graceful degradation: Do not initialize window.Echo
        });
} else {
    console.warn(
        "⚠️ VITE_PUSHER_APP_KEY not set - Echo will not be initialized"
    );
}
