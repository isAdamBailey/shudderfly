import MinigameCard from "../components/MinigameCard.vue";
import { MINIGAME_NAMES } from "../minigames/index.js";

/**
 * A minigame: a small game that plays over the room it's in (minigames/),
 * named by the interactable's `minigame`. Its card says what it is and
 * starts it on Play; nothing leaves the world. A name this client doesn't
 * know does nothing, like an unknown type.
 */
export default {
    activate(item, ctx) {
        if (!MINIGAME_NAMES.includes(item.minigame)) return;
        ctx.openCard(MinigameCard, { item });
    },
};
