import { isIndex } from "@/utils/math";

/**
 * The Cockroach's bass drum. Its head is a button of its own (Room3D.vue):
 * a hit there booms at once, `edge` out from the middle of the head (0 to
 * 1, with the item). Walking up to the drum and using it hits the middle.
 *
 * Told to the room as `[edge]`, in EDGE_STEPS steps.
 */

const EDGE_STEPS = 100;

export default {
    activate(item, ctx) {
        const edge = item.edge ?? 0;
        ctx.hitDrum(item.id, edge);
        ctx.playDrum(edge);
    },
    note: (item) => [Math.round((item.edge ?? 0) * EDGE_STEPS)],
    fromNote(item, which) {
        const [edge] = which;
        if (which.length !== 1 || !isIndex(edge, EDGE_STEPS + 1)) return null;
        return { ...item, edge: edge / EDGE_STEPS };
    },
};
