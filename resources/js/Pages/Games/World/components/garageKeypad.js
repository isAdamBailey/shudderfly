/**
 * The Garage's outdoor keypad clicker (issue #227), as pure state: any
 * CODE_LENGTH digits followed by Enter press the opener. There's no fixed
 * code. Enter with fewer clears them and does nothing, and digits past
 * CODE_LENGTH are ignored until Enter.
 */
export const CODE_LENGTH = 4;

/** A keypad with nothing typed: { entered, digit(), enter() }. */
export function createKeypad() {
    let entered = 0;
    return {
        /** How many digits are in so far (for its dots). */
        get entered() {
            return entered;
        },
        /** A digit key. Which digit doesn't matter. */
        digit() {
            entered = Math.min(entered + 1, CODE_LENGTH);
        },
        /** Enter: whether that opens (a whole code was in). Either way it
         * starts over. */
        enter() {
            const whole = entered === CODE_LENGTH;
            entered = 0;
            return whole;
        },
    };
}
