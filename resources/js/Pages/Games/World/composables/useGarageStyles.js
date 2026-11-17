import { ref } from "vue";

/**
 * Which clicker and which door the Garage has (issue #227), swapped with
 * the buttons beside the clicker and remembered on this device. Storage
 * can be blocked (a private window) or hold a style that's since gone:
 * either way it starts on the first of each, and swapping still works.
 */
export const CLICKERS = ["wall", "fob", "visor", "keypad"];
export const GARAGE_DOORS = ["sectional", "roll-up", "carriage"];

const KEY = "games.world.garage";

function remembered(name, styles) {
    try {
        const style = localStorage.getItem(`${KEY}.${name}`);
        return styles.includes(style) ? style : styles[0];
    } catch {
        return styles[0];
    }
}

function remember(name, style) {
    try {
        localStorage.setItem(`${KEY}.${name}`, style);
    } catch {
        // Not remembered, then: it's still swapped for this visit.
    }
}

/** A style `name` from `styles`: its ref, and next() to swap it on. */
function style(name, styles) {
    const current = ref(remembered(name, styles));
    const next = () => {
        const at = styles.indexOf(current.value);
        current.value = styles[(at + 1) % styles.length];
        remember(name, current.value);
    };
    return [current, next];
}

/** { clicker, door, nextClicker(), nextDoor() }. */
export function useGarageStyles() {
    const [clicker, nextClicker] = style("clicker", CLICKERS);
    const [door, nextDoor] = style("door", GARAGE_DOORS);
    return { clicker, door, nextClicker, nextDoor };
}
