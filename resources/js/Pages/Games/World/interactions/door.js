/**
 * A way into another scene: the House's front door on the road, a room's
 * doors. It goes straight through, with no card, because going in and out is
 * cheap and easy to undo (starting a game still asks first).
 */
export default {
    // Dropping the Butt at a door goes through it, as on the road.
    autoTrigger: true,
    activate(item, ctx) {
        ctx.goToScene(item.to, { spot: item.toSpot, from: item.id });
    },
};
