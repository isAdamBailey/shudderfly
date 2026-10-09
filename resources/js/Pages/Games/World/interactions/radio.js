/**
 * A radio: plays the family's songs (`songs`, a few the server picks at
 * random) through the site's music player. Each tap tunes to the next, and
 * after the last one it switches off. With nothing to play (or the music
 * turned off), it toots and says its line.
 */
export default {
    activate(item, ctx) {
        if (item.songs?.length) {
            ctx.animate(item.id, "wiggle");
            ctx.tuneRadio(item.songs);
            return;
        }
        ctx.toot("butt", item.id);
        ctx.speak(item.line);
    },
};
