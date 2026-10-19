// Echo is made after the page boots (bootstrap.js imports it), and never when
// Pusher isn't configured.
const ATTEMPTS = 20;
const RETRY_MS = 500;

/**
 * Calls `fn(window.Echo)` once Echo exists: now if it does, or after looking
 * again every `every` ms, up to `attempts` times, then gives up quietly so
 * the page carries on without it. Returns a cancel function that stops any
 * look still to come, or null when `fn` has already been called (Echo was
 * there), so a caller's "still waiting" handle is never left set.
 */
export function whenEcho(fn, { attempts = ATTEMPTS, every = RETRY_MS } = {}) {
    let timer = null;
    let left = attempts;
    const look = () => {
        timer = null;
        // A pending look can outlive the page (or a test's teardown).
        if (typeof window === "undefined") return;
        if (window.Echo) {
            fn(window.Echo);
            return;
        }
        if (left-- > 0) timer = setTimeout(look, every);
    };
    look();
    if (!timer) return null;
    return () => {
        clearTimeout(timer);
        timer = null;
    };
}
