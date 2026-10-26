import { reactive, computed, ref, onUnmounted } from "vue";
import {
    PATH_LENGTH,
    PATH_POINTS,
    PATH_START,
    nearestPoint,
} from "./intestinePath.js";

const POOP_RADIUS = 18;
const MAX_SCORE = 1000;
const MIN_SCORE = 100;
const WALL_PENALTY = 10;
const COLLISION_COOLDOWN_MS = 400;
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

    const progress = computed(() => {
        return PATH_POINTS[state.pathIndex].s / PATH_LENGTH;
    });

    function startGame() {
        state.phase = "playing";
        state.poopX = PATH_START.x;
        state.poopY = PATH_START.y;
        state.pathIndex = 0;
        state.collisions = 0;
        state.startTime = Date.now();
        state.endTime = 0;
        state.score = 0;
        lastCollisionTime = 0;
        againstWall = false;
        clearInterval(tickInterval);
        tickInterval = setInterval(() => {
            tick.value++;
        }, 1000);
    }

    let lastCollisionTime = 0;
    // Pressed against a wall since the last bump. Sliding along it, as a
    // held drag does round a bend, is one bump, not one every cooldown.
    let againstWall = false;

    function movePoop(dx, dy) {
        if (state.phase !== "playing") return;

        const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / MAX_STEP));
        let hit = false;
        for (let i = 0; i < steps; i++) {
            hit = stepPoop(dx / steps, dy / steps) || hit;
        }

        if (
            hit &&
            !againstWall &&
            Date.now() - lastCollisionTime > COLLISION_COOLDOWN_MS
        ) {
            state.collisions++;
            lastCollisionTime = Date.now();
        }
        againstWall = hit;

        if (PATH_LENGTH - PATH_POINTS[state.pathIndex].s <= EXIT_SLACK) {
            win();
        }
    }

    // Moves the poop a little, keeping it inside the tube: past the wall it
    // is held against it. True when it touched a wall.
    function stepPoop(dx, dy) {
        let x = state.poopX + dx;
        let y = state.poopY + dy;
        const index = nearestPoint(x, y, state.pathIndex);
        const centre = PATH_POINTS[index];
        const room = centre.hw - POOP_RADIUS;
        const off = Math.hypot(x - centre.x, y - centre.y);
        const hit = off > room;
        if (hit) {
            x = centre.x + ((x - centre.x) * room) / off;
            y = centre.y + ((y - centre.y) * room) / off;
        }
        state.poopX = x;
        state.poopY = y;
        state.pathIndex = index;
        return hit;
    }

    function win() {
        clearInterval(tickInterval);
        state.endTime = Date.now();
        state.score = Math.max(
            MIN_SCORE,
            MAX_SCORE - state.collisions * WALL_PENALTY
        );
        state.phase = "win";
    }

    onUnmounted(() => clearInterval(tickInterval));

    return {
        state,
        elapsedSeconds,
        progress,
        startGame,
        movePoop,
        POOP_RADIUS,
    };
}
