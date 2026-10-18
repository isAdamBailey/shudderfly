import { HARP } from "../scenes/harpLayout.js";

/**
 * The Cockroach's harp. Its strings are a button of their own (Room3D.vue):
 * a strum across them plucks each string it crosses, which come with the
 * item as `strings` (0 the deepest). Walking up to the harp and using it
 * runs a hand up every string instead: a glissando.
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
};
