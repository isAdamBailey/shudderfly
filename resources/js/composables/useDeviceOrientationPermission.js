import { computed, onMounted, ref } from "vue";

const STORAGE_KEY = "device-orientation-granted";

/** iOS is the only engine that gates `deviceorientation`; everywhere else the
 * event fires unprompted and there is nothing to ask for. */
function requestPermissionFn() {
    if (
        typeof window === "undefined" ||
        !("DeviceOrientationEvent" in window)
    ) {
        return null;
    }
    const fn = window.DeviceOrientationEvent?.requestPermission;
    return typeof fn === "function" ? fn : null;
}

/** localStorage throws outright in some privacy modes, so every touch of it is
 * best-effort — a failed read just means we ask again. */
function readStored() {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

function writeStored(granted) {
    try {
        window.localStorage.setItem(STORAGE_KEY, granted ? "1" : "0");
    } catch {
        // Nothing to do — the worst case is prompting again next visit.
    }
}

/**
 * Unlocks the device-orientation half of a parallax effect on iOS 13+.
 *
 * Safari requires `DeviceOrientationEvent.requestPermission()` to be called
 * from a user gesture before it will deliver a single `deviceorientation`
 * event. VueUse's `useDeviceOrientation` — and `useParallax` on top of it —
 * only attaches the listener, so without this the tilt input is silently dead
 * on iPhone and iPad while the mouse path keeps working everywhere else.
 *
 * The listener itself needs no re-attaching: once Safari grants the
 * permission, events start arriving at whatever is already listening, so a
 * caller only has to render `needsPermission` as something tappable and hand
 * the tap to `request()`.
 *
 * @returns {{ needsPermission: import("vue").ComputedRef<boolean>,
 *             request: () => Promise<boolean> }}
 */
export function useDeviceOrientationPermission() {
    // "unsupported" covers both halves of the no-op case: engines without the
    // event, and engines that deliver it without asking. Neither wants a
    // button, and both leave useParallax to behave exactly as it does today.
    const state = ref("unsupported");

    const needsPermission = computed(() => state.value === "prompt");

    async function call() {
        const fn = requestPermissionFn();
        if (!fn) return false;
        // Safari rejects the call outright when it isn't running inside a user
        // gesture, which is a "not yet", not a refusal — leave the button up.
        try {
            const result = await fn.call(window.DeviceOrientationEvent);
            const granted = result === "granted";
            state.value = granted ? "granted" : "denied";
            writeStored(granted);
            return granted;
        } catch {
            return false;
        }
    }

    onMounted(async () => {
        if (!requestPermissionFn()) return;
        state.value = "prompt";
        // Safari remembers a granted origin and resolves without showing the
        // sheet again, so a return visitor gets their tilt back with no button
        // and no second prompt. If it insists on a gesture anyway the call
        // rejects harmlessly and the button stays up.
        if (readStored()) await call();
    });

    // `state` stays internal: the only thing any caller needs is whether to
    // offer the gesture, and a granted/denied/unsupported distinction nothing
    // reads would just be API surface to keep working.
    return {
        needsPermission,
        request: call,
    };
}
