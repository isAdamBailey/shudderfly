import { reactive, computed, ref, onUnmounted } from "vue";

export const SVG_WIDTH = 400;
const PADDING = 20;
const Y_START = 100;
const POOP_RADIUS = 18;
const MAX_SCORE = 1000;
const MIN_SCORE = 100;
const WALL_PENALTY = 10;
const COLLISION_COOLDOWN_MS = 400;
const SEGMENT_HEIGHT = 46;
const NUM_SEGMENTS = 30;

const SEGMENTS = generateIntestinePath();
const TOTAL_PATH_HEIGHT = SEGMENTS[SEGMENTS.length - 1].y + 140;

function generateIntestinePath() {
    const segments = [];
    const usableWidth = SVG_WIDTH - PADDING * 2;
    const midX = SVG_WIDTH / 2;
    let direction = 1;

    for (let i = 0; i < NUM_SEGMENTS; i++) {
        const y = Y_START + i * SEGMENT_HEIGHT;
        const wave = Math.sin(i * 0.35) * 0.3 + 0.7;
        const amplitude = (usableWidth * 0.16) * wave;
        const centerX = midX + direction * amplitude;
        const wallGap = 104 + Math.max(0, 8 - i) * 3.2;

        segments.push({
            y,
            centerX: Math.max(PADDING + wallGap, Math.min(SVG_WIDTH - PADDING - wallGap, centerX)),
            leftWall: Math.max(PADDING, centerX - wallGap),
            rightWall: Math.min(SVG_WIDTH - PADDING, centerX + wallGap),
        });

        if (i % 3 === 2) direction *= -1;
    }

    return segments;
}

function getPassageAt(y) {
    if (y <= SEGMENTS[0].y) return SEGMENTS[0];
    if (y >= SEGMENTS[SEGMENTS.length - 1].y) return SEGMENTS[SEGMENTS.length - 1];

    let lo = 0;
    let hi = SEGMENTS.length - 1;
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (SEGMENTS[mid].y <= y) lo = mid;
        else hi = mid;
    }

    const a = SEGMENTS[lo];
    const b = SEGMENTS[hi];
    const t = (y - a.y) / (b.y - a.y);

    return {
        y,
        centerX: a.centerX + (b.centerX - a.centerX) * t,
        leftWall: a.leftWall + (b.leftWall - a.leftWall) * t,
        rightWall: a.rightWall + (b.rightWall - a.rightWall) * t,
    };
}

export function useGameState() {
    const state = reactive({
        phase: "start",
        poopX: SVG_WIDTH / 2,
        poopY: 30,
        collisions: 0,
        startTime: 0,
        endTime: 0,
        score: 0,
    });

    const tick = ref(0);
    let tickInterval = null;

    const elapsedSeconds = computed(() => {
        tick.value;
        if (!state.startTime) return 0;
        const end = state.endTime || Date.now();
        return Math.floor((end - state.startTime) / 1000);
    });

    const stars = computed(() => {
        if (state.score >= 850) return 3;
        if (state.score >= 500) return 2;
        return 1;
    });

    const progress = computed(() => {
        return Math.min(1, Math.max(0, state.poopY / (TOTAL_PATH_HEIGHT - 140)));
    });

    function startGame() {
        const entry = SEGMENTS[0];
        state.phase = "playing";
        state.poopX = entry.centerX;
        state.poopY = entry.y + 74;
        state.collisions = 0;
        state.startTime = Date.now();
        state.endTime = 0;
        state.score = 0;
        lastCollisionTime = 0;
        clearInterval(tickInterval);
        tickInterval = setInterval(() => { tick.value++; }, 1000);
    }

    let lastCollisionTime = 0;

    function movePoop(dx, dy) {
        if (state.phase !== "playing") return;

        let newX = state.poopX + dx;
        let newY = state.poopY + Math.max(0, dy);

        const passage = getPassageAt(newY);

        const hitLeft = newX - POOP_RADIUS < passage.leftWall;
        const hitRight = newX + POOP_RADIUS > passage.rightWall;

        if (hitLeft) {
            newX = passage.leftWall + POOP_RADIUS;
        }
        if (hitRight) {
            newX = passage.rightWall - POOP_RADIUS;
        }

        if ((hitLeft || hitRight) && Date.now() - lastCollisionTime > COLLISION_COOLDOWN_MS) {
            state.collisions++;
            lastCollisionTime = Date.now();
        }

        state.poopX = newX;
        state.poopY = newY;

        if (newY >= TOTAL_PATH_HEIGHT - 80) {
            win();
        }
    }

    function win() {
        clearInterval(tickInterval);
        state.endTime = Date.now();
        state.score = Math.max(MIN_SCORE, MAX_SCORE - state.collisions * WALL_PENALTY);
        state.phase = "win";
    }

    onUnmounted(() => clearInterval(tickInterval));

    return {
        state,
        segments: SEGMENTS,
        totalHeight: TOTAL_PATH_HEIGHT,
        elapsedSeconds,
        stars,
        progress,
        startGame,
        movePoop,
        getPassageAt,
        POOP_RADIUS,
    };
}
