import GameConfirmCard from "../components/GameConfirmCard.vue";
import GameHost from "../components/GameHost.vue";
import { hostedGame } from "../hostedGames.js";

/**
 * A launcher for one of the games. It asks first. Play leaves for the game
 * page, unless the game is hosted in the world: then Play mounts it over
 * the stage and closing comes back to this spot. The card speaks its words
 * itself, like the other things in the world.
 */
export default {
    activate(item, ctx) {
        const hosted = hostedGame(item.game);
        ctx.openCard(GameConfirmCard, {
            game: item.card,
            ...(hosted
                ? {
                      start: () => ctx.openCard(GameHost, { game: item.card }),
                  }
                : {}),
        });
    },
};
