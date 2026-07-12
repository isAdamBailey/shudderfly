// Shared, app-wide Web Audio context for the games.
//
// Safari/WebKit caps the number of live AudioContexts and starts each one
// `suspended` (only auto-starting inside a user gesture), and it uniquely moves
// contexts into an `"interrupted"` state after focus loss, route changes, or any
// speechSynthesis activity. Creating a fresh context per sound therefore both
// exhausts the hardware-context limit and leaves contexts silently suspended.
//
// This module keeps exactly ONE context for the whole session, unlocks it on the
// first user gesture, and re-resumes it whenever Safari drops it — so every game
// shares a single, reliably-running context. It is never closed.

const isAudioSupported =
    typeof window !== "undefined" &&
    !!(window.AudioContext || window.webkitAudioContext);

let audioCtx = null;
let listenersAttached = false;

// States Safari can leave a context in that require a resume() to play sound.
function isDormant(ctx) {
    return ctx.state === "suspended" || ctx.state === "interrupted";
}

function resumeIfDormant() {
    if (audioCtx && isDormant(audioCtx)) {
        audioCtx.resume().catch(() => {});
    }
}

function attachReArmListeners(ctx) {
    if (listenersAttached || typeof window === "undefined") return;
    listenersAttached = true;

    // Safari fires statechange when it interrupts the context; re-resume it.
    ctx.onstatechange = () => {
        if (isDormant(ctx)) {
            ctx.resume().catch(() => {});
        }
    };

    // Returning to the tab, or any subsequent tap, is a chance to re-unlock.
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") resumeIfDormant();
    });
    window.addEventListener("pointerdown", resumeIfDormant, { passive: true });
}

/**
 * Returns the shared AudioContext, resuming it if Safari left it
 * suspended/interrupted. Returns null when Web Audio is unsupported.
 */
export function getAudioContext() {
    if (!isAudioSupported) return null;
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        attachReArmListeners(audioCtx);
    }
    resumeIfDormant();
    return audioCtx;
}

/**
 * Unlock audio during a user gesture (the Play/tap handler). Creates the context
 * if needed and awaits resume() so later, gesture-less sounds aren't silenced by
 * the autoplay policy. Safe to call repeatedly.
 */
export async function unlockAudio() {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (isDormant(ctx)) {
        try {
            await ctx.resume();
        } catch {
            /* ignore */
        }
    }
    return ctx;
}
