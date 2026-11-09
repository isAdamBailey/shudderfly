import SoundboardCard from "../components/SoundboardCard.vue";

/** The exhibit's altar opens a personal board; it never sends a room note. */
export default {
    activate(_item, ctx) {
        ctx.openCard(SoundboardCard, ctx.soundboard);
    },
};
