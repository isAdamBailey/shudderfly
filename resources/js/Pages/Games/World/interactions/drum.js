/**
 * The Cockroach's bass drum. Its head is a button of its own (Room3D.vue):
 * a hit there booms at once, `edge` out from the middle of the head (0 to
 * 1, with the item). Walking up to the drum and using it hits the middle.
 */
export default {
    activate(item, ctx) {
        const edge = item.edge ?? 0;
        ctx.hitDrum(item.id, edge);
        ctx.playDrum(edge);
    },
};
