import { computed, ref } from "vue";
import { COCKROACH, POOP } from "@/constants/characters.js";
import { FOOD_TYPES } from "@/Pages/Games/TootFoods/composables/useTootGame.js";

export const FOOD_EMOJI_POOL = FOOD_TYPES.map((food) => food.emoji);
const EMOJI_POOL = [COCKROACH, POOP, ...FOOD_EMOJI_POOL];

let nextId = 1;

// Global state (shared across all components)
const particles = ref([]);

const randomBetween = (min, max) => Math.random() * (max - min) + min;

export function useEmojiRise() {
    const spawnEmojiRise = (count = 6, options = {}) => {
        const {
            pool = EMOJI_POOL,
            minDuration = 2.2,
            maxDuration = 3.6,
        } = options;

        for (let i = 0; i < count; i += 1) {
            const id = nextId++;
            const duration = randomBetween(minDuration, maxDuration);
            const delay = randomBetween(0, 0.4);

            particles.value.push({
                id,
                emoji: pool[Math.floor(Math.random() * pool.length)],
                left: randomBetween(5, 95),
                size: randomBetween(1.2, 2.2),
                duration,
                delay,
            });

            setTimeout(() => {
                particles.value = particles.value.filter((p) => p.id !== id);
            }, (duration + delay) * 1000);
        }
    };

    return {
        particles: computed(() => particles.value),
        spawnEmojiRise,
    };
}
