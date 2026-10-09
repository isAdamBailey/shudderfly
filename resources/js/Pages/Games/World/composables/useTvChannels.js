import { reactive } from "vue";

/**
 * Which channel each TV in a room is showing (issue #130), DOM-free: off
 * until it's used, then each of its `channels` in turn, then off again
 * after the last. A video that ends goes on to the next channel, round to
 * the first again (`wrap`), so a TV left on keeps playing.
 */
export function useTvChannels(items) {
    // A TV's id → the index of the channel it's showing, while it's on.
    const tuned = reactive({});

    /** What TV `item` is showing: { channel, number } (from 1), or null
     * while it's off (or `item` isn't a TV). */
    function channelOf(item) {
        const i = tuned[item.id];
        return i === undefined
            ? null
            : { channel: item.channels[i], number: i + 1 };
    }

    /** TV `id`'s next channel (ctx.changeChannel). */
    function changeChannel(id, { wrap = false } = {}) {
        const count = items.find((item) => item.id === id)?.channels?.length;
        if (!count) return;
        const next = id in tuned ? tuned[id] + 1 : 0;
        if (next < count) tuned[id] = next;
        else if (wrap) tuned[id] = 0;
        else delete tuned[id];
    }

    return { channelOf, changeChannel };
}
