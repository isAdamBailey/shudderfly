import { reactive, computed, ref } from "vue";

const MOVE_X_MIN          = 4;
const MOVE_X_MAX          = 10;
const WOBBLE_Y_MIN        = 2;
const WOBBLE_Y_MAX        = 6;
const Y_MIN               = 15;
const Y_MAX               = 80;
const COLLISION_GAP       = 14;
const TOUCHING_GAP        = 8;
const FIGHT_DURATION_MS   = 2500;
const SCORE_BASE          = 600;
const SCORE_PER_TAP       = 40;
const SCORE_MIN           = 50;

const FACTS = [
    "Madagascar hissing cockroaches can live up to 5 years!",
    "They hiss by pushing air through breathing holes called spiracles.",
    "Males have large horns on their thorax for fighting rivals.",
    "They are one of the largest cockroach species — up to 3 inches long!",
    "Unlike most cockroaches, they have no wings at all.",
    "They can climb smooth glass with special pads on their feet.",
    'A group of hissing cockroaches is sometimes called an "intrusion."',
    "Baby hissing cockroaches are called nymphs and are bright white at birth.",
    "They are completely harmless to humans — no biting or stinging!",
    "Males hiss to attract mates and scare off other males.",
];

function getHighScore() {
    try {
        return parseInt(localStorage.getItem("cockroach_fight_high_score") || "0", 10);
    } catch {
        return 0;
    }
}

function randomWobble() {
    const amount = WOBBLE_Y_MIN + Math.random() * (WOBBLE_Y_MAX - WOBBLE_Y_MIN);
    return Math.random() < 0.5 ? -amount : amount;
}

function randomStep() {
    return MOVE_X_MIN + Math.random() * (MOVE_X_MAX - MOVE_X_MIN);
}

function clampY(y) {
    return Math.max(Y_MIN, Math.min(Y_MAX, y));
}

function computeScore(tapCount) {
    return Math.max(SCORE_MIN, SCORE_BASE - tapCount * SCORE_PER_TAP);
}

function computeStars(tapCount) {
    if (tapCount <= 8) return 3;
    if (tapCount <= 14) return 2;
    return 1;
}

export function useGameState() {
    const state = reactive({
        phase: "start",
        tapCount: 0,
        score: 0,
        leftX: 20,
        leftY: 45,
        rightX: 80,
        rightY: 55,
        leftHissing: false,
        rightHissing: false,
        leftFighting: false,
        rightFighting: false,
        highScore: getHighScore(),
    });

    const stars = computed(() => computeStars(state.tapCount));

    const currentFact = ref(randomFact());

    let fightTimeoutId = null;
    let hissTimeoutIds = { left: null, right: null };

    function randomFact() {
        return FACTS[Math.floor(Math.random() * FACTS.length)];
    }

    function clearFightTimeout() {
        if (fightTimeoutId !== null) {
            clearTimeout(fightTimeoutId);
            fightTimeoutId = null;
        }
    }

    function clearHissTimeout(side) {
        if (hissTimeoutIds[side] !== null) {
            clearTimeout(hissTimeoutIds[side]);
            hissTimeoutIds[side] = null;
        }
    }

    function startGame() {
        clearFightTimeout();
        clearHissTimeout("left");
        clearHissTimeout("right");

        state.phase         = "playing";
        state.tapCount      = 0;
        state.score         = 0;
        state.leftX         = 20;
        state.leftY         = 45;
        state.rightX        = 80;
        state.rightY        = 55;
        state.leftHissing   = false;
        state.rightHissing  = false;
        state.leftFighting  = false;
        state.rightFighting = false;
        currentFact.value   = randomFact();
    }

    function isColliding() {
        return state.rightX - state.leftX < COLLISION_GAP;
    }

    function snapTogether() {
        const mid = (state.leftX + state.rightX) / 2;
        const halfGap = TOUCHING_GAP / 2;
        state.leftX = mid - halfGap;
        state.rightX = mid + halfGap;
        const avgY = (state.leftY + state.rightY) / 2;
        state.leftY = avgY;
        state.rightY = avgY;
    }

    function triggerFight() {
        snapTogether();
        state.phase         = "fighting";
        state.leftFighting  = true;
        state.rightFighting = true;
        state.leftHissing   = true;
        state.rightHissing  = true;

        clearFightTimeout();
        fightTimeoutId = setTimeout(() => {
            fightTimeoutId = null;
            state.score = computeScore(state.tapCount);
            if (state.score > state.highScore) {
                state.highScore = state.score;
                try {
                    localStorage.setItem("cockroach_fight_high_score", String(state.score));
                } catch {
                    // Ignore storage errors so the win screen still renders
                }
            }
            state.phase = "win";
            state.leftHissing  = false;
            state.rightHissing = false;
        }, FIGHT_DURATION_MS);
    }

    function tap(side) {
        if (state.phase !== "playing") return false;

        state.tapCount++;

        const step = randomStep();
        state.leftX  = state.leftX + step;
        state.rightX = state.rightX - step;
        state.leftY  = clampY(state.leftY + randomWobble());
        state.rightY = clampY(state.rightY + randomWobble());

        if (side === "left") {
            state.leftHissing = true;
            clearHissTimeout("left");
            hissTimeoutIds.left = setTimeout(() => {
                state.leftHissing = false;
                hissTimeoutIds.left = null;
            }, 900);
        } else {
            state.rightHissing = true;
            clearHissTimeout("right");
            hissTimeoutIds.right = setTimeout(() => {
                state.rightHissing = false;
                hissTimeoutIds.right = null;
            }, 900);
        }

        if (isColliding()) {
            triggerFight();
        }

        return true;
    }

    function cleanup() {
        clearFightTimeout();
        clearHissTimeout("left");
        clearHissTimeout("right");
    }

    return { state, stars, currentFact, startGame, tap, cleanup };
}
