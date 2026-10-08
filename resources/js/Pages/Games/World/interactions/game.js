import GameConfirmCard from "../components/GameConfirmCard.vue";

/**
 * A launcher for one of the games. It asks first: starting a game leaves the
 * world, so the Listen / Play / Cancel card stands between the tap and the
 * game page.
 */
export default {
    activate(item, ctx) {
        ctx.openCard(GameConfirmCard, { game: item.card });
    },
};
