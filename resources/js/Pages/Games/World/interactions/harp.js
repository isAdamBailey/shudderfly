import { HARP } from "../scenes/harpLayout.js";
import { isIndex } from "@/utils/math";

/**
 * The Cockroach's harp. Its strings are a button of their own (Room3D.vue):
 * a strum across them plucks each string it crosses, which come with the
 * item as `strings` (0 the deepest). Walking up to the harp and using it
 * runs a hand up every string instead: a glissando.
 *
 * Told to the room as the strings plucked, or `[]` for a glissando.
 */

// How far apart a glissando's strings are plucked, s.
const GLISSANDO_GAP = 0.06;

export default {
    activate(item, ctx) {
        const strings =
            item.strings ??
            Array.from({ length: HARP.strings.count }, (_, n) => n);
        const gap = item.strings ? 0 : GLISSANDO_GAP;
        strings.forEach((n, i) => {
            ctx.pluckString(item.id, n, i * gap);
            ctx.playHarp(n, i * gap);
        });
    },
    note: (item) => item.strings ?? [],
    fromNote(item, which) {
        if (which.length === 0) return item;
        const { count } = HARP.strings;
        // Each string once: a string plucked twice at once is only louder.
        if (new Set(which).size !== which.length) return null;
        if (!which.every((n) => isIndex(n, count))) return null;
        return { ...item, strings: which };
    },
};
