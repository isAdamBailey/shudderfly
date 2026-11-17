/**
 * The Garage door's button (issue #227), on its side wall: a press starts
 * the door up or down, stops it while it moves, or sends it back the way
 * it came (scenes/garageOpener.js, which Room3D.vue owns).
 */
import { playGarageClick } from "../garageSounds.js";

export default {
    activate(_item, ctx) {
        playGarageClick();
        ctx.pressGarageDoor();
    },
};
