import { reactive, computed, ref, onUnmounted } from "vue";
import {
    PATH_LENGTH,
    PATH_POINTS,
    PATH_START,
    nearestPoint,
} from "./intestinePath.js";

const POOP_RADIUS = 18;
// Faster is better: full marks less a few for every second on the clock,
// never below the floor. Touching the walls costs nothing.
const MAX_SCORE = 1000;
const MIN_SCORE = 100;
const POINTS_PER_SECOND = 10;
// No move goes further than this at once, so a fast drag cannot carry the
// poop through a wall into the coil beside it.
const MAX_STEP = POOP_RADIUS / 2;
// Close enough to the end of the tube to be out.
const EXIT_SLACK = 24;

export function useGameState() {
    const state = reactive({
        phase: "start",
        poopX: PATH_START.x,
        poopY: PATH_START.y,
        // The centreline sample the poop is beside.
        pathIndex: 0,
        startTime: 0,
        endTime: 0,
        score: 0,
    });

    const tick = ref(0);
    let tickInterval = null;

    // Seconds on the clock: none before it starts, frozen once out.
    function secondsRun() {
        if (!state.startTime) return 0;
        return ((state.endTime || Date.now()) - state.startTime) / 1000;
    }

    const elapsedSeconds = computed(() => {
        tick.value;
        return Math.floor(secondsRun());
    });

    const progress = computed(() => {
        return PATH_POINTS[state.pathIndex].s / PATH_LENGTH;
    });

    function startGame() {
        state.phase = "playing";
        state.poopX = PATH_START.x;
        state.poopY = PATH_START.y;
        state.pathIndex = 0;
        state.startTime = 0;
        state.endTime = 0;
        state.score = 0;
        clearInterval(tickInterval);
    }

    // The clock runs from when the poop can be steered, not from the
    // stomach intro before it.
    function startClock() {
        state.startTime = Date.now();
        clearInterval(tickInterval);
        tickInterval = setInterval(() => {
            tick.value++;
        }, 1000);
    }

    function movePoop(dx, dy) {
        if (state.phase !== "playing") return;

        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / MAX_STEP));
        for (let i = 0; i < steps; i++) {
            stepPoop(dx / steps, dy / steps);
        }

        if (PATH_LENGTH - PATH_POINTS[state.pathIndex].s <= EXIT_SLACK) {
            win();
        }
    }

    // Moves the poop a little, keeping it inside the tube: past the wall it
    // is held against it.
    function stepPoop(dx, dy) {
        let x = state.poopX + dx;
        let y = state.poopY + dy;
        const index = nearestPoint(x, y, state.pathIndex);
        const centre = PATH_POINTS[index];
        const room = centre.hw - POOP_RADIUS;
        const off = Math.hypot(x - centre.x, y - centre.y);
        if (off > room) {
            x = centre.x + ((x - centre.x) * room) / off;
            y = centre.y + ((y - centre.y) * room) / off;
        }
        state.poopX = x;
        state.poopY = y;
        state.pathIndex = index;
    }

    function win() {
        clearInterval(tickInterval);
        state.endTime = Date.now();
        state.score = Math.max(
            MIN_SCORE,
            Math.round(MAX_SCORE - secondsRun() * POINTS_PER_SECOND)
        );
        state.phase = "win";
    }

    onUnmounted(() => clearInterval(tickInterval));

    return {
        state,
        elapsedSeconds,
        progress,
        startGame,
        startClock,
        movePoop,
        POOP_RADIUS,
    };
}
