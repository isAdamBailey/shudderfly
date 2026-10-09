import { defineAsyncComponent } from "vue";
import { own } from "@/utils/object";

/**
 * The minigames: small games that play inside the world, over the room
 * they're in, rather than on a page of their own (issue #130). A `minigame`
 * interactable names one of these (`minigame: "toot-catch"`); the names are
 * GamesWorld::MINIGAMES, and a test keeps the two in step. Each loads the
 * first time it's played.
 *
 * A minigame is a Vue component with one prop, `kit`, and it reaches the
 * world through that alone: it never imports from the stage, a scene or a
 * handler. It fills its parent (position it absolutely, `inset: 0`), which
 * the host (components/MinigameCard.vue) sizes, and it takes focus itself.
 * `kit` is:
 * - CastMember: the DOM cast drawer, for every character it shows.
 * - createCastKit: the WebGL one (castMesh.js), for a minigame that draws
 *   in three; give it THREE, and dispose of the kit when done.
 * - toot(castId, at): the one toot (useToot), the puff at `at`, { x, y } as
 *   fractions (0..1) of the minigame's box, so it needn't measure itself.
 * - speak(text): says a line, in the same voice as the rest of the world.
 * - playSound(name): a sound from World/sounds.js.
 * - reducedMotion: a ref, true when motion should be kept down.
 * - finish({ score }): the round is over. The host shows the score and
 *   offers another go, which mounts the minigame afresh.
 * Escape closes the host; the minigame needn't handle it.
 */
const MINIGAMES = {
    "toot-catch": () => import("./TootCatch/TootCatch.vue"),
};

export const MINIGAME_NAMES = Object.keys(MINIGAMES);

/** Minigame `name`'s component, loaded when it's first shown, or null for
 * a name this client doesn't know. */
export function minigameComponent(name) {
    const load = own(MINIGAMES, name);
    return load ? defineAsyncComponent(load) : null;
}
