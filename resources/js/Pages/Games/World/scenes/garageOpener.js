import { approach } from "@/utils/math";
import { clamp } from "../composables/useGamesWorld.js";

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
 *
 * And like a real one, its safety sensor sees anything under the door
 * (issue #230): coming down on the Butt, it goes back up.
 */
export const OPENER = {
    // s for the door to go all the way up or down.
    travel: 6,
    // s the light stays on once the door has stopped.
    light: 4,
};

/** A new opener, its door where `rest` ({ position, last }, as rest()
 * gave it) left it, or shut: { position, moving, lit, press(), tick(dt,
 * reduced, under), rest() }. It starts still, its light off. */
export function createOpener({ position: at = 0, last: was = -1 } = {}) {
    let position = clamp(Number(at) || 0, 0, 1);
    // Where it's going (+1 up, -1 down), 0 standing still.
    let going = 0;
    // The way it last went, so a press after a stop sends it back. All the
    // way up or down, the way it went to get there.
    let last = position === 1 || (position > 0 && was === 1) ? 1 : -1;
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
        /** Where the door will be once it stops, to remember it by: { position,
         * last }, its end if it's on its way to one, for createOpener(). */
        rest() {
            if (going === 0) return { position, last };
            return { position: going > 0 ? 1 : 0, last: going };
        },
        /** Carries the door on by `dt` s (to its end at once when
         * `reduced`): whether anything changed to draw, and the end it
         * reached ("open" at the top, "closed" at the bottom) if it got
         * there this tick. Coming down with something `under` it, it turns
         * back up, and says it `reversed`. */
        tick(dt, reduced, under = false) {
            const reversed = going < 0 && under;
            if (reversed) {
                last = 1;
                // Not yet off the top: it doesn't start down at all.
                if (position === 1) {
                    stop();
                    return { changed: false, arrived: null, reversed };
                }
                going = 1;
            }
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
            if (position !== end) {
                return { changed: true, arrived: null, reversed };
            }
            stop();
            return {
                changed: true,
                arrived: end ? "open" : "closed",
                reversed,
            };
        },
    };
}
