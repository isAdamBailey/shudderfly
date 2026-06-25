import { computed, ref } from "vue";
import { COCKROACH, POOP } from "@/constants/characters.js";
import { FOOD_TYPES } from "@/Pages/Games/TootFoods/composables/useTootGame.js";

const EMOJI_POOL = [COCKROACH, POOP, ...FOOD_TYPES.map((food) => food.emoji)];

let nextId = 1;

// Global state (shared across all components)
const particles = ref([]);

const randomBetween = (min, max) => Math.random() * (max - min) + min;

export function useEmojiRise() {
  const spawnEmojiRise = (count = 6) => {
    for (let i = 0; i < count; i += 1) {
      const id = nextId++;
      const duration = randomBetween(2.2, 3.6);
      const delay = randomBetween(0, 0.4);

      particles.value.push({
        id,
        emoji: EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)],
        left: randomBetween(5, 95),
        size: randomBetween(1.2, 2.2),
        duration,
        delay
      });

      setTimeout(() => {
        particles.value = particles.value.filter((p) => p.id !== id);
      }, (duration + delay) * 1000);
    }
  };

  return {
    particles: computed(() => particles.value),
    spawnEmojiRise
  };
}
