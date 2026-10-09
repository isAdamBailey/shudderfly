/**
 * A TV: the family's videos (`channels`, a few the server picks at random)
 * play right on its screen in the room. Each tap changes channel, and after
 * the last one it switches off. With nothing to show, it toots and says
 * its line.
 */
export default {
    activate(item, ctx) {
        if (item.channels?.length) {
            ctx.changeChannel(item.id);
            return;
        }
        ctx.toot("butt", item.id);
        ctx.speak(item.line);
    },
};
