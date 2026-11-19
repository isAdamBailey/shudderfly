import { vi } from "vitest";
import { ref } from "vue";
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import CastPuppet from "../components/CastPuppet.vue";

/**
 * A minigame test's clock and kit. Frames are run by hand: every
 * requestAnimationFrame callback waits for frame(). Cancelling one frame
 * leaves the rest, so a cast member cancelling its own (a toot) doesn't
 * stop the game's loop.
 *
 * installFrames() in beforeEach, restoreFrames() in afterEach.
 */
let frames = new Map();
let nextFrame = 0;
let now = 0;

export function installFrames() {
    frames = new Map();
    now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (callback) => {
        frames.set(++nextFrame, callback);
        return nextFrame;
    });
    vi.stubGlobal("cancelAnimationFrame", (id) => frames.delete(id));
}

export function restoreFrames() {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
}

/** Runs one frame, `seconds` after the last. */
export function frame(seconds = 1 / 60) {
    now += seconds * 1000;
    const due = [...frames.values()];
    frames = new Map();
    due.forEach((callback) => callback(now));
}

/** Runs frames for about `seconds`. */
export function run(seconds) {
    for (let t = 0; t < seconds; t += 1 / 60) frame();
}

/** A minigame's kit (minigames/index.js), its calls spied on. */
export function makeKit(reduced = false) {
    return {
        CastMember,
        CastPuppet,
        createCastKit: vi.fn(),
        toot: vi.fn(),
        speak: vi.fn(),
        playSound: vi.fn(),
        reducedMotion: ref(reduced),
        finish: vi.fn(),
    };
}
