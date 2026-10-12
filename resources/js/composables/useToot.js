import { usePage } from "@inertiajs/vue3";
import { onBeforeUnmount, ref } from "vue";
import { CAST } from "@/constants/characters.js";
import { useTootSound } from "@/composables/useTootSound";
import { own } from "@/utils/object";

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
 * The sample is the page's `fartSoundUrl`. A character with sounds of its
 * own in the page's `castSounds` ({ castId: [url] }: Guster's) toots one of
 * them at random instead, and the sample at its pitch if it has none.
 * `sounds` stands in for the page's props.
 *
 * Render `puffs` ({ id, x, y, castId }, in the caller's coordinates) with
 * TootPuff, passing it the `castId` of whoever tooted.
 * Call `unlock()` from a user gesture before the first toot; autoplay rules
 * would silence it otherwise.
 */
export function useToot(sounds = usePage().props) {
    const { fartSoundUrl = "/fart.m4a" } = sounds;
    const castSounds = sounds.castSounds ?? {};
    const puffs = ref([]);
    const timers = new Set();
    let nextId = 0;
    // Made on first use, so a visit that never toots never downloads it.
    let sound = null;
    function getSound() {
        if (!sound)
            sound = useTootSound(
                fartSoundUrl,
                Object.values(castSounds).flat()
            );
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
        const recordings = own(castSounds, castId) ?? [];
        const clip =
            recordings[Math.floor(Math.random() * recordings.length)] ?? null;
        getSound().playToot(tootPitch(castId), clip);
        if (!at) return;

        const id = ++nextId;
        puffs.value.push({ id, x: at.x, y: at.y, castId });
        const timer = setTimeout(() => {
            timers.delete(timer);
            puffs.value = puffs.value.filter((puff) => puff.id !== id);
        }, PUFF_MS);
        timers.add(timer);
    }

    onBeforeUnmount(() => timers.forEach(clearTimeout));

    return { puffs, toot, unlock };
}
