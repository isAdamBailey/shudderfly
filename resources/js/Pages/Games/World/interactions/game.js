import GameConfirmCard from "../components/GameConfirmCard.vue";
import GameHost from "../components/GameHost.vue";

/**
 * A launcher for one of the games. It asks first; Play mounts the game over
 * the stage (GameHost), and closing comes back to this spot. The card speaks
 * its words itself, like the other things in the world.
 */
export default {
    activate(item, ctx) {
        ctx.openCard(GameConfirmCard, {
            game: item.card,
            start: () => ctx.openCard(GameHost, { game: item.card }),
        });
    },
};
