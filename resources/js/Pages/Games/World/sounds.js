import { playHiss } from "@/composables/playHiss";
import { audioRunning } from "@/composables/useAudioContext";
import { own } from "@/utils/object";

/**
 * The world's named sounds (issue #130): what a cast member's `sounds` and a
 * toy's `sound` refer to. Farts aren't here: they go through useToot.
 */
const SOUNDS = { hiss: playHiss };

/** Plays sound `name` (a toy's). */
export function playSound(name) {
    own(SOUNDS, name)?.();
}

/** Plays sound `name` if audio is already running: for sounds nobody asked
 * for (a cockroach popping up), which would only get the browser's autoplay
 * warning before the first gesture. */
export function playAmbientSound(name) {
    if (audioRunning()) playSound(name);
}
