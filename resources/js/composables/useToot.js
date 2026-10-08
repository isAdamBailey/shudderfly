import { onBeforeUnmount, ref } from "vue";
import { CAST } from "@/constants/characters.js";
import { useTootSound } from "@/composables/useTootSound";

// How long a puff stays up; matches the longest animation in TootPuff.vue.
export const PUFF_MS = 720;

/** The pitch a cast member toots at: its tootPitch, or the sample's own. */
export function tootPitch(castId) {
    return CAST[castId]?.tootPitch ?? 1;
}

/**
 * The one toot (issue #130): the fart sample at the character's pitch, plus a
 * 💨 puff and "toot!" (TootPuff.vue) where it happened. Everything in the
 * world that farts goes through this, so they all sound and look alike.
 *
 * Render `puffs` ({ id, x, y }, in the caller's coordinates) with TootPuff.
 * Call `unlock()` from a user gesture before the first toot; autoplay rules
 * would silence it otherwise.
 */
export function useToot(fartSoundUrl = "/fart.m4a") {
    const puffs = ref([]);
    const timers = new Set();
    let nextId = 0;
    // Made on first use, so a visit that never toots never downloads it.
    let sound = null;
    function getSound() {
        if (!sound) sound = useTootSound(fartSoundUrl);
        return sound;
    }
    let unlocking = null;
    let unlocked = false;

    /** Call from a gesture (pointerup or click; a touch pointerdown doesn't
     * count). Retries on the next gesture until it works. */
    function unlock() {
        if (unlocked || unlocking) return;
        unlocking = getSound()
            .initAudio()
            .then((ok) => {
                unlocked = ok;
                unlocking = null;
            });
    }

    /** Toots as `castId`; `at` ({ x, y }) also shows a puff there. */
    function toot(castId, at = null) {
        getSound().playToot(tootPitch(castId));
        if (!at) return;

        const id = ++nextId;
        puffs.value.push({ id, x: at.x, y: at.y });
        const timer = setTimeout(() => {
            timers.delete(timer);
            puffs.value = puffs.value.filter((puff) => puff.id !== id);
        }, PUFF_MS);
        timers.add(timer);
    }

    onBeforeUnmount(() => timers.forEach(clearTimeout));

    return { puffs, toot, unlock };
}
