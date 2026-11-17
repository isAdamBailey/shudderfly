import { onBeforeUnmount, ref } from "vue";

/**
 * For a clicker's buttons that are only for show (issue #227): tapping
 * one blinks its LED and lights the button for a moment, as a real
 * remote does when it sends, and does nothing else.
 *
 * GarageClicker.vue draws the blink (`.blink`, keyed on `n`) and the lit
 * button (`.sending .glyph`) in the picture's `--led` colour, for
 * `BLINK_MS`.
 *
 * `blink.value` is `{ name, n }` while blinking (`name` the button
 * tapped, `n` counting taps so a blink element keyed on it restarts its
 * animation on a quick second tap), `null` otherwise.
 */
export const BLINK_MS = 700;

export function useBlink() {
    const blink = ref(null);
    let taps = 0;
    let timer = null;

    function send(name) {
        taps += 1;
        blink.value = { name, n: taps };
        clearTimeout(timer);
        timer = setTimeout(() => (blink.value = null), BLINK_MS);
    }

    const blinking = (name) => blink.value?.name === name;

    onBeforeUnmount(() => clearTimeout(timer));
    return { blink, send, blinking };
}
