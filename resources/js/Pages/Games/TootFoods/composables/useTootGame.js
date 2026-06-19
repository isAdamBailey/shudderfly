import { reactive, ref, computed, onUnmounted } from "vue";

export const ROUND_SECONDS = 30;
const COMBO_WINDOW_MS = 1200;
const MAX_COMBO_BONUS = 5;
const START_SPEED_FACTOR = 0.25; // butt begins at 25% of top speed, ramps to 100%
const FOOD_COUNT = 5;
const HUD_SAFE_TOP = 96; // keep foods/butt clear of the score+timer HUD
const EDGE_MARGIN = 56;

// The five fart-makers. pitch = playbackRate for the toot (bigger food = lower).
export const FOOD_TYPES = [
    { type: "blueberries", emoji: "🫐", pitch: 1.4 },
    { type: "grapes", emoji: "🍇", pitch: 1.22 },
    { type: "strawberry", emoji: "🍓", pitch: 1.1 },
    { type: "apple", emoji: "🍎", pitch: 0.92 },
    { type: "sprout", emoji: "🥦", pitch: 0.78 },
];

const HIGH_SCORE_KEY = "tootFoodsHighScore";

let nextId = 1;

function readHighScore() {
    try {
        return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
    } catch {
        return 0;
    }
}

function writeHighScore(value) {
    try {
        localStorage.setItem(HIGH_SCORE_KEY, String(value));
    } catch {
        /* ignore */
    }
}

export function useTootGame(callbacks = {}) {
    const { onToot, onEnd } = callbacks;

    const bounds = reactive({ w: 0, h: 0 });

    const state = reactive({
        phase: "start", // start | playing | end
        score: 0,
        foodsFed: 0,
        combo: 0, // current streak length (0 = no active streak)
    });

    const timeLeft = ref(ROUND_SECONDS);
    const highScore = ref(readHighScore());

    // Butt size and chase speed scale with the smaller screen dimension.
    const buttSize = computed(() => {
        const min = Math.min(bounds.w, bounds.h) || 360;
        return Math.max(96, Math.min(150, min * 0.2));
    });
    const hitRadius = computed(() => buttSize.value * 0.62);

    const butt = reactive({ x: 0, y: 0, squash: 0, facing: 1 });
    const foods = reactive([]);
    const bursts = reactive([]); // toot puffs near the butt
    const popups = reactive([]); // floating "+N" / combo text

    let target = { x: 0, y: 0 };
    let rafId = null;
    let lastFrame = 0;
    let startTime = 0;
    let lastHitTime = 0;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function randomPoint(avoid = null, avoidDist = 0) {
        const w = bounds.w || 360;
        const h = bounds.h || 640;
        const minX = EDGE_MARGIN;
        const maxX = Math.max(minX + 1, w - EDGE_MARGIN);
        const minY = HUD_SAFE_TOP;
        const maxY = Math.max(minY + 1, h - EDGE_MARGIN);
        for (let i = 0; i < 12; i++) {
            const x = rand(minX, maxX);
            const y = rand(minY, maxY);
            if (!avoid || Math.hypot(x - avoid.x, y - avoid.y) > avoidDist) {
                return { x, y };
            }
        }
        return { x: rand(minX, maxX), y: rand(minY, maxY) };
    }

    function spawnFood() {
        const def = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
        const pos = randomPoint(butt, buttSize.value * 1.3);
        foods.push({
            id: nextId++,
            ...def,
            x: pos.x,
            y: pos.y,
            dragging: false,
            leaving: false,
            wobble: rand(0, Math.PI * 2),
        });
    }

    function setBounds(w, h) {
        bounds.w = w;
        bounds.h = h;
        if (!butt.x && !butt.y) {
            butt.x = w / 2;
            butt.y = h / 2;
            target = randomPoint();
        }
    }

    function pickNewTarget() {
        target = randomPoint();
    }

    function frame(now) {
        if (state.phase !== "playing") return;
        if (!lastFrame) lastFrame = now;
        const dt = Math.min(0.05, (now - lastFrame) / 1000);
        lastFrame = now;

        // Countdown
        const remaining = ROUND_SECONDS - (now - startTime) / 1000;
        timeLeft.value = Math.max(0, Math.ceil(remaining));
        if (remaining <= 0) {
            end();
            return;
        }

        // Combo decay — streak lapses if no hit within the window.
        if (state.combo > 0 && now - lastHitTime > COMBO_WINDOW_MS) {
            state.combo = 0;
        }

        // Butt wanders toward its target. It starts slow and eases up to full
        // speed as the round elapses, but never exceeds the top speed.
        const maxSpeed = Math.max(120, Math.min(290, Math.min(bounds.w, bounds.h) * 0.78));
        const elapsedFrac = Math.min(1, Math.max(0, 1 - remaining / ROUND_SECONDS));
        const speed = maxSpeed * (START_SPEED_FACTOR + (1 - START_SPEED_FACTOR) * elapsedFrac);
        const dx = target.x - butt.x;
        const dy = target.y - butt.y;
        const dist = Math.hypot(dx, dy);
        const step = speed * dt;
        if (dist <= step || dist < 4) {
            butt.x = target.x;
            butt.y = target.y;
            pickNewTarget();
        } else {
            butt.x += (dx / dist) * step;
            butt.y += (dy / dist) * step;
            if (Math.abs(dx) > 6) butt.facing = dx > 0 ? 1 : -1;
        }

        // Ease the squash recoil back to rest.
        if (butt.squash > 0) {
            butt.squash = Math.max(0, butt.squash - dt * 4);
        }

        rafId = requestAnimationFrame(frame);
    }

    function start() {
        state.phase = "playing";
        state.score = 0;
        state.foodsFed = 0;
        state.combo = 0;
        timeLeft.value = ROUND_SECONDS;
        foods.splice(0, foods.length);
        bursts.splice(0, bursts.length);
        popups.splice(0, popups.length);
        butt.x = (bounds.w || 360) / 2;
        butt.y = (bounds.h || 640) / 2;
        butt.squash = 0;
        pickNewTarget();
        for (let i = 0; i < FOOD_COUNT; i++) spawnFood();
        startTime = performance.now();
        lastFrame = 0;
        lastHitTime = 0;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(frame);
    }

    function startDrag(id) {
        const food = foods.find((f) => f.id === id);
        if (food && !food.leaving) food.dragging = true;
    }

    function updateDrag(id, x, y) {
        const food = foods.find((f) => f.id === id);
        if (food && food.dragging) {
            food.x = x;
            food.y = y;
        }
    }

    /**
     * Release a dragged food. If it lands on the butt -> toot + score.
     * A miss carries no penalty: the food simply respawns elsewhere.
     * @returns {boolean} whether it was a hit
     */
    function endDrag(id, x, y) {
        const food = foods.find((f) => f.id === id);
        if (!food) return false;
        food.dragging = false;

        const hit = Math.hypot(x - butt.x, y - butt.y) <= hitRadius.value;
        if (hit) {
            registerToot(food);
        } else {
            // No-penalty miss: reset to a fresh spot.
            food.leaving = true;
            replaceFood(food.id, 220);
        }
        return hit;
    }

    function registerToot(food) {
        const now = performance.now();
        const inCombo = now - lastHitTime <= COMBO_WINDOW_MS;
        state.combo = inCombo ? state.combo + 1 : 1;
        lastHitTime = now;

        const bonus = Math.min(state.combo - 1, MAX_COMBO_BONUS);
        const points = 1 + bonus;
        state.score += points;
        state.foodsFed += 1;

        butt.squash = 1;

        const burstId = nextId++;
        bursts.push({ id: burstId, x: butt.x, y: butt.y, emoji: food.emoji });
        setTimeout(() => {
            const idx = bursts.findIndex((b) => b.id === burstId);
            if (idx !== -1) bursts.splice(idx, 1);
        }, 720);

        const popId = nextId++;
        popups.push({
            id: popId,
            x: butt.x,
            y: butt.y - buttSize.value * 0.5,
            text: state.combo >= 2 ? `+${points} · x${state.combo}` : `+${points}`,
            big: state.combo >= 2,
        });
        setTimeout(() => {
            const idx = popups.findIndex((p) => p.id === popId);
            if (idx !== -1) popups.splice(idx, 1);
        }, 760);

        food.leaving = true;
        replaceFood(food.id, 160);

        if (onToot) onToot(food, points, state.combo);
    }

    function replaceFood(id, delay) {
        setTimeout(() => {
            const idx = foods.findIndex((f) => f.id === id);
            if (idx !== -1) foods.splice(idx, 1);
            if (state.phase === "playing") spawnFood();
        }, delay);
    }

    function end() {
        cancelAnimationFrame(rafId);
        rafId = null;
        state.phase = "end";
        state.combo = 0;
        timeLeft.value = 0;
        if (state.score > highScore.value) {
            highScore.value = state.score;
            writeHighScore(state.score);
        }
        if (onEnd) onEnd(state.score, state.foodsFed);
    }

    function reset() {
        cancelAnimationFrame(rafId);
        rafId = null;
        state.phase = "start";
    }

    onUnmounted(() => cancelAnimationFrame(rafId));

    return {
        state,
        timeLeft,
        highScore,
        butt,
        buttSize,
        foods,
        bursts,
        popups,
        setBounds,
        start,
        startDrag,
        updateDrag,
        endDrag,
        reset,
    };
}
