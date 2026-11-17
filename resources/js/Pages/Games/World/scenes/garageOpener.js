import { approach } from "@/utils/math";

/**
 * The Garage's door opener (issue #227), as pure state: Room3D.vue owns
 * one, presses it from the wall button and ticks it each frame;
 * RoomScene.js only draws where the door is (`position`, 0 shut to 1
 * open) and whether the opener's light is on (`lit`).
 *
 * It behaves like a real one: a press while the door is moving stops
 * it, and the next press sends it back the way it came. The light comes
 * on with a press and stays on OPENER.light s after the door stops.
 * Under reduced motion the door gets where it's going at once.
 */
export const OPENER = {
    // s for the door to go all the way up or down.
    travel: 6,
    // s the light stays on once the door has stopped.
    light: 4,
};

/** A new opener, its door shut: { position, moving, lit, press(),
 * tick(dt, reduced) }. */
export function createOpener() {
    let position = 0;
    // Where it's going (+1 up, -1 down), 0 standing still.
    let going = 0;
    // The way it last went, so a press after a stop sends it back.
    let last = -1;
    // s the light has left to stay on, once the door has stopped.
    let light = 0;
    let lit = false;

    /** Leaves the light on its full time from now. */
    const stop = () => {
        going = 0;
        light = OPENER.light;
    };

    return {
        get position() {
            return position;
        },
        get moving() {
            return going !== 0;
        },
        get lit() {
            return lit;
        },
        /** Stops the door if it's moving, or starts it the other way. */
        press() {
            lit = true;
            if (going !== 0) {
                stop();
                return;
            }
            going = -last;
            last = going;
        },
        /** Carries the door on by `dt` s (to its end at once when
         * `reduced`): whether anything changed to draw, and the end it
         * reached ("open" at the top, "closed" at the bottom) if it got
         * there this tick. */
        tick(dt, reduced) {
            if (going === 0) {
                if (!lit) return { changed: false, arrived: null };
                light -= dt;
                lit = light > 0;
                return { changed: !lit, arrived: null };
            }
            const end = going > 0 ? 1 : 0;
            position = reduced
                ? end
                : approach(position, end, dt / OPENER.travel);
            if (position !== end) return { changed: true, arrived: null };
            stop();
            return { changed: true, arrived: end ? "open" : "closed" };
        },
    };
}
