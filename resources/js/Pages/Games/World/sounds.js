import { playHiss } from "@/composables/playHiss";
import { audioRunning } from "@/composables/useAudioContext";
import { own } from "@/utils/object";
import { playBell, playTick } from "./clockSounds.js";
import { playBonk, playChomp } from "./foodSounds.js";

/**
 * The world's named sounds (issue #130): what a cast member's `sounds` and a
 * toy's `sound` refer to. Farts aren't here: they go through useToot.
 * The names are GamesWorld::SOUNDS.
 */
const SOUNDS = {
    hiss: playHiss,
    tick: playTick,
    bell: playBell,
    chomp: playChomp,
    bonk: playBonk,
};

export const SOUND_NAMES = Object.keys(SOUNDS);

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
