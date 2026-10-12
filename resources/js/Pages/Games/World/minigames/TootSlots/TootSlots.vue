<script setup>
import { GUSTER_CSS_VARS } from "@/constants/characters.js";
import { useTranslations } from "@/composables/useTranslations";
import { computed, onMounted, ref } from "vue";
import { useMinigameLoop } from "../useMinigameLoop.js";
import { MACHINE_CSS_VARS } from "./machineColors.js";
import { useTootSlots } from "./useTootSlots.js";

// Toot Slots: the slot machine on Guster's wall. Pull the lever (or tap
// the machine) and three reels of the cast spin and stop one by one; three
// Gusters in a row wins, and Guster toots for it. Like every minigame it
// reaches the world only through `kit` (minigames/index.js).
const props = defineProps({
    kit: { type: Object, required: true },
});

const { t } = useTranslations();

const still = computed(() => props.kit.reducedMotion.value);
const game = useTootSlots({ calm: still.value });
const { state } = game;

const leverRef = ref(null);

// The lever stays down a moment after it's pulled.
const leverDown = computed(() => state.spinning && state.elapsed < 0.35);

// What a screen reader hears after each pull: the spins left (a win is
// said aloud anyway, by kit.speak), and nothing after the last.
const said = computed(() =>
    state.won === null || state.spinsLeft === 0
        ? ""
        : t("games.world.minigames.toot_slots_spins", {
              spins: state.spinsLeft,
          })
);

function pull() {
    if (game.pull()) props.kit.playSound("whoosh");
}

// --- The loop -------------------------------------------------------------------

useMinigameLoop((dt) => {
    for (const event of game.step(dt)) {
        if (event.type === "stop") props.kit.playSound("tick");
        if (event.type === "win") {
            props.kit.playSound("fanfare");
            props.kit.toot("guster", { x: 0.45, y: 0.45 });
            props.kit.speak(t("games.world.minigames.toot_slots_win"));
        }
        if (event.type === "finish") {
            props.kit.finish({ score: state.score });
            return false;
        }
    }
});

onMounted(() => leverRef.value?.focus({ preventScroll: true }));
</script>

<template>
    <div
        class="slots-field"
        :class="{ 'slots-still': still }"
        :style="[GUSTER_CSS_VARS, MACHINE_CSS_VARS]"
    >
        <div class="slots-hud" aria-hidden="true">
            <span>🪙 {{ state.spinsLeft }}</span>
            <span>⭐ {{ state.score }}</span>
        </div>

        <div class="slots-machine-row">
            <div
                class="slots-machine"
                :class="{ 'slots-won': state.won }"
                @click="pull"
            >
                <div class="slots-sign" aria-hidden="true">
                    <span class="slots-puff slots-puff-left">💨</span>
                    <component
                        :is="kit.CastMember"
                        id="guster"
                        :move="still ? null : 'idle'"
                    />
                    <span class="slots-puff">💨</span>
                </div>
                <div class="slots-window" aria-hidden="true">
                    <div
                        v-for="(reel, i) in state.reels"
                        :key="i"
                        class="slots-reel"
                        :class="{ 'slots-reel-spinning': reel.spinning }"
                    >
                        <component
                            :is="kit.CastMember"
                            :id="reel.symbol"
                            class="slots-symbol"
                            :move="null"
                        />
                    </div>
                    <div class="slots-payline" />
                </div>
                <div class="slots-tray" aria-hidden="true" />
            </div>

            <button
                ref="leverRef"
                type="button"
                class="slots-lever"
                :class="{ 'slots-lever-down': leverDown }"
                :aria-label="t('games.world.minigames.toot_slots_lever')"
                :aria-disabled="!game.canPull()"
                @click.stop="pull"
            >
                <span class="slots-lever-arm" aria-hidden="true">
                    <span class="slots-lever-knob" />
                </span>
                <span class="slots-lever-hub" aria-hidden="true" />
            </button>
        </div>

        <p class="sr-only" aria-live="polite">{{ said }}</p>
    </div>
</template>

<style scoped>
.slots-field {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: clamp(2rem, 9vmin, 3.25rem);
    /* His living room: a pale wall over a mossy floor, like Toot Catch. */
    background: #fbfcf3
        linear-gradient(
            rgb(var(--guster-highlight-rgb) / 0.45),
            rgb(var(--guster-highlight-rgb) / 0.9) 80%,
            var(--guster-mid) 80%,
            var(--guster-shade)
        );
}

.slots-hud {
    position: absolute;
    top: 0.5rem;
    left: 0.75rem;
    right: 4rem;
    display: flex;
    gap: 1.25rem;
    font-family: "Spicy Rice", cursive;
    font-size: clamp(1.1rem, 4vmin, 1.5rem);
    color: var(--guster-base);
    text-shadow: 0 1px 0 var(--guster-eye-white),
        0 0 6px var(--guster-eye-white);
}

.slots-machine-row {
    display: flex;
    align-items: center;
    margin-top: 1.5rem;
}

.slots-machine {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.3em 0.35em 0.25em;
    /* How it shines when it's won. */
    --slots-lit: 0 0.15em 0 var(--machine-green-dark),
        0 0 0.6em 0.2em var(--machine-gold);
    border: 0.08em solid var(--machine-green-dark);
    border-radius: 0.9em 0.9em 0.3em 0.3em;
    background: linear-gradient(
        var(--machine-green-light),
        var(--machine-green)
    );
    box-shadow: 0 0.15em 0 var(--machine-green-dark),
        0 0.3em 0.6em rgb(0 0 0 / 0.3);
    cursor: pointer;
    user-select: none;
}

.slots-sign {
    display: flex;
    align-items: center;
    gap: 0.1em;
    font-size: 0.8em;
    line-height: 1;
    margin-bottom: 0.15em;
}

.slots-puff {
    font-size: 0.6em;
}

/* The emoji blows right; the left one blows the other way. */
.slots-puff-left {
    transform: scaleX(-1);
}

.slots-window {
    position: relative;
    display: flex;
    gap: 0.1em;
    padding: 0.12em;
    border-radius: 0.2em;
    background: var(--machine-green-dark);
    box-shadow: inset 0 0 0 0.05em var(--machine-gold);
}

.slots-reel {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5em;
    height: 1.7em;
    overflow: hidden;
    border-radius: 0.12em;
    background: linear-gradient(#d4d4d8, #fff 30%, #fff 70%, #d4d4d8);
}

.slots-symbol {
    line-height: 1;
}

.slots-reel-spinning .slots-symbol {
    filter: blur(1.5px);
    animation: slots-roll 0.08s linear infinite;
}

@keyframes slots-roll {
    from {
        transform: translateY(-35%);
    }
    to {
        transform: translateY(35%);
    }
}

.slots-payline {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 0.04em;
    background: var(--machine-red);
    opacity: 0.7;
    pointer-events: none;
}

.slots-tray {
    width: 70%;
    height: 0.3em;
    margin-top: 0.2em;
    border-radius: 0 0 0.2em 0.2em;
    background: var(--machine-green-dark);
}

/* Three Gusters: the machine lights up. */
.slots-won {
    animation: slots-flash 0.3s ease-in-out 4 alternate;
}

@keyframes slots-flash {
    to {
        box-shadow: var(--slots-lit);
    }
}

/* The lever: an arm on a hub at the machine's side, pivoting at its foot. */
.slots-lever {
    position: relative;
    width: 0.9em;
    height: 2.6em;
    margin-left: 0.1em;
    border-radius: 0.3em;
    cursor: pointer;
    outline: none;
}

.slots-lever:focus-visible {
    box-shadow: 0 0 0 3px #1d4ed8;
}

.slots-lever-arm {
    position: absolute;
    left: 50%;
    bottom: 0.45em;
    width: 0.14em;
    height: 1.9em;
    margin-left: -0.07em;
    border-radius: 0.07em;
    background: linear-gradient(90deg, #71717a, #e4e4e7, #71717a);
    transform-origin: 50% 100%;
    transition: transform 0.15s ease-in;
}

.slots-lever-knob {
    position: absolute;
    left: 50%;
    top: -0.25em;
    width: 0.5em;
    height: 0.5em;
    margin-left: -0.25em;
    border-radius: 50%;
    background: radial-gradient(
        circle at 35% 35%,
        #fca5a5,
        var(--machine-red) 60%
    );
}

.slots-lever-down .slots-lever-arm {
    transform: scaleY(-1);
}

.slots-lever-hub {
    position: absolute;
    left: 0.05em;
    right: 0.05em;
    bottom: 0.15em;
    height: 0.6em;
    border-radius: 0.2em;
    background: var(--machine-green-dark);
}

.slots-still .slots-reel-spinning .slots-symbol {
    animation: none;
}

.slots-still .slots-won {
    animation: none;
    box-shadow: var(--slots-lit);
}

.slots-still .slots-lever-arm {
    transition: none;
}
</style>
