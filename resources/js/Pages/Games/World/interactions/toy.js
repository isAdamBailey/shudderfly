/**
 * Something in a room to play with: it does whichever of these its data
 * asks for, all through `ctx`, and goes nowhere. A toy that is a character
 * (`cast`) plays its own moves; a prop (`emoji`) can play any.
 * - move: a move to play on it (a state change instead, under reduced
 *   motion: the scene handles that).
 * - toot: a cast id to toot as, the puff at the toy.
 * - sound: a named sound (sounds.js).
 * - light: the id of a room light it switches on or off.
 * - line: a translated line to say.
 * Using one needs a tap or Enter: walking past doesn't set it off.
 */
export default {
    activate(item, ctx) {
        if (item.move) ctx.animate(item.id, item.move);
        if (item.toot) ctx.toot(item.toot, item.id);
        if (item.sound) ctx.playSound(item.sound);
        if (item.light) ctx.toggleLight(item.light);
        if (item.line) ctx.speak(item.line);
    },
};
