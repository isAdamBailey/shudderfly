/**
 * The way through the Garage's door (issue #230), from either side: the
 * opening in the Garage's back wall out to the road, and the Garage on the
 * road back in. Only while the door is all the way up: shut, or part-way,
 * the Butt bumps into it and says so (its `line`). It's only opened from
 * inside (the Garage's button and clicker), so the road's says how.
 */
export default {
    // Walking up to it goes through, as a door does.
    autoTrigger: true,
    activate(item, ctx) {
        if (ctx.garageOpen()) {
            ctx.goToScene(item.to, { spot: item.toSpot, from: item.id });
            return;
        }
        ctx.bump();
        if (item.line) ctx.speak(item.line);
    },
};
