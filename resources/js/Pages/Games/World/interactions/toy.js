/**
 * Something in a room to play with: it does whichever of these its data
 * asks for, all through `ctx`, and goes nowhere. A toy that is a character
 * (`cast`) plays its own moves; a prop (`emoji`) can play any.
 * - move: a move to play on it (a state change instead, under reduced
 *   motion: the scene handles that).
 * - toot: a cast id to toot as, the puff at the toy.
 * - sound: a named sound (sounds.js).
 * - clip: the URL of a recording the toot plays instead of the fart.
 * - light: the id of a room light it switches on or off, or a list of ids
 *   it switches together.
 * - line: a translated line to say.
 * - shared: the room hears it played (issue #174's notes, as the
 *   auditorium's instruments): its move, toot and sound, nothing else.
 * Using one needs a tap or Enter: walking past doesn't set it off.
 */
export default {
    activate(item, ctx) {
        if (item.move) ctx.animate(item.id, item.move);
        if (item.toot) ctx.toot(item.toot, item.id, item.clip);
        if (item.sound) ctx.playSound(item.sound);
        if (item.light) ctx.toggleLight(item.light);
        if (item.line) ctx.speak(item.line);
    },
    // Nothing to tell but that it was played.
    note: (item) => (item.shared ? [] : null),
    fromNote(item, which) {
        if (!item.shared || which.length !== 0) return null;
        const { move, toot, clip, sound } = item;
        return { id: item.id, type: item.type, move, toot, clip, sound };
    },
};
