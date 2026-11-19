<script setup>
import { useTranslations } from "@/composables/useTranslations";
import { computed, onMounted, ref, watch } from "vue";
import { useMinigameLoop } from "../useMinigameLoop.js";
import {
    FIXES_PER_POOP,
    TOOLS,
    useButtsNotWorking,
} from "./useButtsNotWorking.js";

// Butts Not Working, from the plumber's toolbox in the Butt's bathroom:
// the Butt's poop is stuck, it says which tool it needs, and you tap that
// one in the toolbox. Enough fixes and out pops the poop with a toot. Like
// every minigame it reaches the world only through `kit` (minigames/index.js).
const props = defineProps({
    kit: { type: Object, required: true },
});

const { t } = useTranslations();

/** Each tool's look and the sound it makes at work. */
const TOOL_LOOKS = {
    hammer: { emoji: "🔨", sound: "bonk" },
    saw: { emoji: "🪚", sound: "whoosh" },
    wrench: { emoji: "🔧", sound: "tick" },
    screwdriver: { emoji: "🪛", sound: "tick" },
    plunger: { emoji: "🪠", sound: "pop" },
};

const still = computed(() => props.kit.reducedMotion.value);
const game = useButtsNotWorking();
const { state } = game;

const buttRef = ref(null);
// The first tool, which takes focus (a function ref: a string one in a
// v-for never reaches the setup binding in a production build).
let firstTool = null;

const toolName = (tool) => t(`games.world.minigames.butts_not_working_${tool}`);
const secondsLeft = computed(() => Math.ceil(state.timeLeft));
const resting = computed(() => state.phase !== "fixing");
// How far out the poop is, 0..1: the progress bar, and how far it pokes out.
const progress = computed(() => state.fixes / FIXES_PER_POOP);
const buttMove = computed(() => {
    if (still.value) return null;
    return state.phase === "oops" ? "wiggle" : "idle";
});

// What a screen reader hears: the tool asked for, or that it was wrong.
const said = ref("");

function say(line) {
    said.value = line;
    props.kit.speak(line);
}

// Each new ask, said aloud (the same tool is never asked twice running).
watch(
    () => state.need,
    (tool) => say(`${toolName(tool)}!`),
    { immediate: true }
);

function use(tool) {
    const result = game.use(tool);
    if (!result) return;
    if (result === "oops") {
        props.kit.playSound("thud");
        say(
            t("games.world.minigames.butts_not_working_wrong", {
                tool: toolName(state.need),
            })
        );
        return;
    }
    if (result === "fix") {
        props.kit.playSound(TOOL_LOOKS[tool].sound);
        return;
    }
    // Out it comes: the toot and fanfare, not the tool, so both are heard.
    props.kit.playSound("fanfare");
    say(t("games.world.minigames.butts_not_working_freed"));
    props.kit.toot("butt", { x: 0.5, y: 0.45 });
    buttRef.value?.play("toot");
}

// --- The loop -------------------------------------------------------------------

useMinigameLoop((dt) => {
    if (game.step(dt)) {
        props.kit.finish({ score: state.score });
        return false;
    }
});

onMounted(() => firstTool?.focus({ preventScroll: true }));
</script>

<template>
    <div class="fix-field" :class="{ 'fix-still': still }">
        <div class="fix-hud" aria-hidden="true">
            <span>💩 {{ state.score }}</span>
            <span>⏱️ {{ secondsLeft }}</span>
        </div>

        <div class="fix-stage" aria-hidden="true">
            <div
                class="fix-bubble"
                :class="{ 'fix-bubble-oops': state.phase === 'oops' }"
            >
                <span v-if="state.phase !== 'freed'" :key="state.need">{{
                    TOOL_LOOKS[state.need].emoji
                }}</span>
                <span v-else>😌</span>
            </div>

            <div class="fix-butt-spot">
                <span
                    v-if="state.phase !== 'freed'"
                    class="fix-poop"
                    :style="{ '--out': progress }"
                    >💩</span
                >
                <component
                    :is="kit.CastPuppet"
                    id="butt"
                    ref="buttRef"
                    class="fix-butt"
                    :move="buttMove"
                />
                <span
                    v-if="state.phase === 'working' || state.phase === 'freed'"
                    class="fix-at-work"
                    :class="`fix-at-work-${state.need}`"
                    >{{ TOOL_LOOKS[state.need].emoji }}</span
                >
                <span v-if="state.phase === 'oops'" class="fix-boing">❓</span>
            </div>
        </div>

        <div
            class="fix-progress"
            role="progressbar"
            :aria-label="t('games.world.minigames.butts_not_working_progress')"
            aria-valuemin="0"
            :aria-valuemax="FIXES_PER_POOP"
            :aria-valuenow="state.fixes"
        >
            <span class="fix-progress-track" aria-hidden="true">
                <span
                    class="fix-progress-fill"
                    :class="{ 'fix-progress-done': state.phase === 'freed' }"
                    :style="{ width: `${progress * 100}%` }"
                />
            </span>
            <span class="fix-progress-goal" aria-hidden="true">💩</span>
        </div>

        <!-- Out it comes: big, over everything. -->
        <div
            v-if="state.phase === 'freed'"
            class="fix-freed"
            aria-hidden="true"
        >
            <span class="fix-freed-burst">💥</span>
            <span class="fix-freed-poop">💩</span>
            <span class="fix-freed-words">{{
                t("games.world.minigames.butts_not_working_freed")
            }}</span>
        </div>

        <div
            class="fix-toolbox"
            role="group"
            :aria-label="t('games.world.minigames.butts_not_working_tools')"
        >
            <button
                v-for="(tool, i) in TOOLS"
                :key="tool"
                :ref="
                    (el) => {
                        if (i === 0) firstTool = el;
                    }
                "
                type="button"
                class="fix-tool"
                :aria-label="toolName(tool)"
                :aria-disabled="resting"
                @click="use(tool)"
            >
                <span class="fix-tool-emoji" aria-hidden="true">{{
                    TOOL_LOOKS[tool].emoji
                }}</span>
                <span class="fix-tool-name" aria-hidden="true">{{
                    toolName(tool)
                }}</span>
            </button>
        </div>

        <p class="sr-only" aria-live="polite">{{ said }}</p>
    </div>
</template>

<style scoped>
.fix-field {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-size: clamp(2rem, 9vmin, 3.25rem);
    /* The bathroom's tiled wall; the floor is the toolbox's. */
    background: repeating-linear-gradient(
            90deg,
            transparent 0 1.6rem,
            rgb(255 255 255 / 0.7) 1.6rem 1.7rem
        ),
        repeating-linear-gradient(
            transparent 0 1.6rem,
            rgb(255 255 255 / 0.7) 1.6rem 1.7rem
        ),
        #e0f2fe;
}

.fix-hud {
    position: absolute;
    top: 0.5rem;
    left: 0.75rem;
    right: 4rem;
    display: flex;
    gap: 1.25rem;
    font-family: "Spicy Rice", cursive;
    font-size: clamp(1.1rem, 4vmin, 1.5rem);
    color: #1e3a8a;
    text-shadow: 0 1px 0 #fff, 0 0 6px #fff;
}

.fix-stage {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-top: 2.5rem;
}

/* What the Butt needs, in a thought bubble over it. */
.fix-bubble {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.8em;
    height: 1.5em;
    border: 0.06em solid #1e3a8a;
    border-radius: 50%;
    background: #fff;
    line-height: 1;
    animation: fix-pop 0.25s ease-out;
}

.fix-bubble-oops {
    animation: fix-shake 0.35s ease-in-out;
}

.fix-butt-spot {
    position: relative;
    margin-top: 0.15em;
}

.fix-butt {
    position: relative;
    font-size: 1.9em;
    line-height: 1;
}

/* The stuck poop, wedged in the cleft where the cheeks meet (as the
   puppet is turned, near the right of its box), working further out and
   growing as the fixes go in. Drawn over the puppet. */
.fix-poop {
    position: absolute;
    z-index: 1;
    left: 82%;
    bottom: 46%;
    font-size: 0.5em;
    line-height: 1;
    transform: translate(-50%, calc(40% + var(--out) * 0.7em))
        rotate(calc(-25deg + var(--out) * 20deg))
        scale(calc(0.8 + var(--out) * 0.5));
    transition: transform 0.25s ease-out;
}

/* The tool at work over the Butt, each with its own move. */
.fix-at-work {
    position: absolute;
    right: -0.6em;
    top: 0;
    line-height: 1;
    animation: fix-tap 0.45s ease-in-out;
}

.fix-at-work-saw {
    animation-name: fix-saw;
}

.fix-at-work-wrench,
.fix-at-work-screwdriver {
    animation-name: fix-turn;
}

.fix-at-work-plunger {
    animation-name: fix-plunge;
}

.fix-boing {
    position: absolute;
    right: -0.5em;
    top: -0.2em;
    line-height: 1;
    animation: fix-pop 0.25s ease-out;
}

@keyframes fix-tap {
    50% {
        transform: rotate(-60deg);
    }
}

@keyframes fix-saw {
    25% {
        transform: translateX(-0.3em);
    }
    75% {
        transform: translateX(0.3em);
    }
}

@keyframes fix-turn {
    to {
        transform: rotate(360deg);
    }
}

@keyframes fix-plunge {
    50% {
        transform: translateY(0.3em) scaleY(0.8);
    }
}

@keyframes fix-pop {
    from {
        transform: scale(0.4);
    }
}

@keyframes fix-shake {
    25% {
        transform: translateX(-0.1em);
    }
    75% {
        transform: translateX(0.1em);
    }
}

/* How far out the poop is: a bar filling toward a poop. */
.fix-progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: min(18rem, 80%);
    margin: 0 auto 0.6rem;
}

.fix-progress-track {
    flex: 1;
    height: 1rem;
    overflow: hidden;
    border: 0.15rem solid #78350f;
    border-radius: 999px;
    background: #fff;
}

.fix-progress-fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(#ca8a04, #a16207);
    transition: width 0.25s ease-out;
}

.fix-progress-done {
    background: linear-gradient(#4ade80, #16a34a);
}

.fix-progress-goal {
    font-size: 1.5rem;
    line-height: 1;
}

/* The poop out: it bursts out big over everything, then bounces away. */
.fix-freed {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

.fix-freed-burst {
    position: absolute;
    font-size: 3.5em;
    line-height: 1;
    opacity: 0.85;
    animation: fix-burst 0.6s ease-out forwards;
}

.fix-freed-poop {
    position: relative;
    font-size: 2.6em;
    line-height: 1;
    animation: fix-freed 2.6s forwards;
}

.fix-freed-words {
    position: relative;
    margin-top: 0.1em;
    font-family: "Spicy Rice", cursive;
    font-size: 0.8em;
    color: #16a34a;
    text-shadow: 0 0.05em 0 #fff, 0 0 0.2em #fff;
    animation: fix-pop 0.35s ease-out;
}

@keyframes fix-burst {
    from {
        transform: scale(0.2);
    }
    to {
        transform: scale(1.4);
        opacity: 0;
    }
}

@keyframes fix-freed {
    /* It grows out of the Butt, slowing as it gets bigger. */
    0% {
        transform: translate(0.6em, 1.4em) scale(0.2) rotate(-25deg);
        animation-timing-function: cubic-bezier(0.15, 0.6, 0.3, 1);
    }
    45% {
        transform: scale(1.1) rotate(6deg);
        animation-timing-function: ease-in-out;
    }
    55%,
    80% {
        transform: scale(1) rotate(0);
        opacity: 1;
        animation-timing-function: ease-in;
    }
    /* Then off it bounces. */
    100% {
        transform: translate(3em, -3em) scale(0.5) rotate(360deg);
        opacity: 0;
    }
}

/* The tools laid out on the bathroom floor, one tile a tool, under a
   skirting board where the wall meets it. */
.fix-toolbox {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.6rem 0.5rem 0.7rem;
    border-top: 0.3rem solid #cbd5e1;
    background: repeating-conic-gradient(#dbeafe 0 25%, #bfdbfe 0 50%) 0 0 /
        2.4rem 2.4rem;
}

.fix-tool {
    display: flex;
    flex: 1;
    max-width: 5rem;
    flex-direction: column;
    align-items: center;
    padding: 0.3rem 0.1rem;
    border: 0.12rem solid #93c5fd;
    border-radius: 0.6rem;
    background: #fff;
    box-shadow: 0 0.2rem 0 #60a5fa, 0 0.35rem 0.5rem rgb(30 58 138 / 0.15);
    cursor: pointer;
    outline: none;
    transition: transform 0.1s;
}

.fix-tool:active {
    transform: translateY(0.15rem);
    box-shadow: 0 0.05rem 0 #60a5fa;
}

.fix-tool:focus-visible {
    box-shadow: 0 0 0 3px #1d4ed8;
}

.fix-tool[aria-disabled="true"] {
    opacity: 0.6;
}

.fix-tool-emoji {
    font-size: 0.8em;
    line-height: 1;
}

.fix-tool-name {
    margin-top: 0.15rem;
    font-size: clamp(0.6rem, 2.4vmin, 0.8rem);
    font-weight: 700;
    color: #1e3a8a;
}

.fix-still * {
    animation: none !important;
    transition: none !important;
}

/* Kept still, the burst is left out; the big poop and words stay up. */
.fix-still .fix-freed-burst {
    display: none;
}
</style>
