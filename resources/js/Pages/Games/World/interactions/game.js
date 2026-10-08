import GameConfirmCard from "../components/GameConfirmCard.vue";

/**
 * A launcher for one of the games. It asks first: starting a game leaves the
 * world, so the Play / Cancel card stands between the tap and the game page.
 * The card speaks its words itself, like the other things in the world.
 */
export default {
    activate(item, ctx) {
        ctx.openCard(GameConfirmCard, { game: item.card });
    },
};
