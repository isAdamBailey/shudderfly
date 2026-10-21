import { ORGAN } from "../scenes/organLayout.js";
import { isIndex } from "@/utils/math";

/**
 * The Cockroach's pipe organ. Each zone of its keyboard is a button of its
 * own (Room3D.vue), which plays the key pressed in it: `zone` (0 the
 * deepest) and `key` (0 to 6, A to G) come with the item. Walking up to the
 * organ and using it plays a chord instead: dun, dun, DUN.
 *
 * Told to the room as `[zone, key]`, or `[]` for the chord.
 */

// The chord: A minor, in the low zone.
const CHORD = { zone: 1, keys: [0, 2, 4] };

export default {
    activate(item, ctx) {
        const zone = item.zone ?? CHORD.zone;
        const keys = item.key === undefined ? CHORD.keys : [item.key];
        for (const key of keys) {
            ctx.pressKey(item.id, zone, key);
            ctx.playOrgan(zone, key);
        }
    },
    note: (item) => (item.key === undefined ? [] : [item.zone, item.key]),
    fromNote(item, which) {
        if (which.length === 0) return item;
        if (which.length !== 2) return null;
        const [zone, key] = which;
        if (!isIndex(zone, ORGAN.zones) || !isIndex(key, ORGAN.whiteKeys)) {
            return null;
        }
        return { ...item, zone, key };
    },
};
