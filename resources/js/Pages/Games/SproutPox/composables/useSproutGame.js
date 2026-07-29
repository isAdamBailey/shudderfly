import { reactive, ref, computed, onUnmounted } from "vue";

const FRICTION = 0.992; // per-frame (60fps-normalized) velocity decay
const WALL_RESTITUTION = 0.72;
const STOP_SPEED = 12; // px/s below which a rolling sprout is considered settled
export const MAX_DRAG = 150; // px of pull-back for full power
const MAX_LAUNCH_SPEED = 980; // px/s at full power
const SPROUT_RADIUS_FRAC = 0.032; // of min(bounds) — sprout collision radius
const LAUNCH_Y_FRAC = 0.88; // sprout starting position, fraction of stage height
const LAUNCH_BOTTOM_MARGIN = 56; // px kept clear below the sprout's resting spot
const MOUTH_Y_FRAC = 0.2; // mouth center, fraction of stage height
const MOUTH_HEIGHT_FRAC = 0.09; // mouth hit-box height, fraction of stage height
const BASE_POINTS = 20;
const MAX_SPEED_BONUS = 30;
export const TOTAL_SPROUTS = 10; // fixed for the whole game — levels never grant more

const HIGH_SCORE_KEY = "sproutPoxHighScore";

// Fixed, hand-placed spots around the face box (percentages), so pox dots
// never move once they land and stay clear of the eyes/mouth.
const POX_SPOTS = [
    { x: 22, y: 24, size: 9 },
    { x: 76, y: 22, size: 8 },
    { x: 14, y: 46, size: 7 },
    { x: 86, y: 45, size: 8 },
    { x: 30, y: 12, size: 7 },
    { x: 68, y: 13, size: 9 },
    { x: 20, y: 62, size: 8 },
    { x: 80, y: 63, size: 7 },
    { x: 50, y: 8, size: 7 },
    { x: 38, y: 88, size: 8 },
    { x: 62, y: 87, size: 7 },
    { x: 47, y: 40, size: 6 },
];

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

/** Chicken pox dots needed to clear a level. */
export function poxTarget(level) {
    return Math.min(8, 2 + level);
}

/** Mouth width as a fraction of stage width. */
export function mouthWidthFrac(level) {
    return Math.max(0.11, 0.26 - (level - 1) * 0.02);
}

export function mouthOpenMs(level) {
    return Math.max(650, 1600 - (level - 1) * 120);
}

export function mouthClosedMs(level) {
    return Math.min(1400, 700 + (level - 1) * 80);
}

export function poxDotPosition(index) {
    const spot = POX_SPOTS[index % POX_SPOTS.length];
    const growth = Math.floor(index / POX_SPOTS.length) * 1.5;
    return { x: spot.x, y: spot.y, size: spot.size + growth };
}

export function useSproutGame(callbacks = {}) {
    const { onLaunch, onHit, onMiss, onLevelUp, onEnd } = callbacks;

    const bounds = reactive({ w: 0, h: 0 });

    const state = reactive({
        phase: "start", // start | playing | end
        shotState: "ready", // ready | aiming | rolling
        score: 0,
        level: 1,
        poxCount: 0,
        levelPox: 0,
        sproutsLeft: 0,
        mouthOpen: false,
    });

    const highScore = ref(readHighScore());
    const levelBanner = ref(false);

    const sprout = reactive({ x: 0, y: 0, vx: 0, vy: 0, spin: 0 });
    const aim = reactive({ x: 0, y: 0, active: false });
    const pox = reactive([]);
    const popups = reactive([]);

    const sproutRadius = computed(
        () => Math.min(bounds.w, bounds.h || 1) * SPROUT_RADIUS_FRAC
    );

    const mouthWidth = computed(() => bounds.w * mouthWidthFrac(state.level));
    const mouthCenter = computed(() => ({
        x: bounds.w / 2,
        y: bounds.h * MOUTH_Y_FRAC,
    }));
    const mouthHeight = computed(() => bounds.h * MOUTH_HEIGHT_FRAC);

    const launchOrigin = computed(() => ({
        x: bounds.w / 2,
        y: Math.min(bounds.h * LAUNCH_Y_FRAC, bounds.h - LAUNCH_BOTTOM_MARGIN),
    }));

    const aimVector = computed(() => {
        const origin = launchOrigin.value;
        const dx = origin.x - aim.x;
        const dy = origin.y - aim.y;
        const dist = Math.hypot(dx, dy);
        const power = Math.min(1, dist / MAX_DRAG);
        const angle = Math.atan2(dy, dx);
        return { dx, dy, dist, power, angle, valid: power > 0.04 };
    });

    let rafId = null;
    let lastFrame = 0;
    let mouthElapsed = 0;

    function setBounds(w, h) {
        bounds.w = w;
        bounds.h = h;
    }

    function resetSproutToOrigin() {
        const origin = launchOrigin.value;
        sprout.x = origin.x;
        sprout.y = origin.y;
        sprout.vx = 0;
        sprout.vy = 0;
        sprout.spin = 0;
        state.shotState = "ready";
    }

    function startLevel(level) {
        state.level = level;
        state.levelPox = 0;
        resetSproutToOrigin();
    }

    function start() {
        state.phase = "playing";
        state.score = 0;
        state.poxCount = 0;
        state.sproutsLeft = TOTAL_SPROUTS;
        pox.splice(0, pox.length);
        popups.splice(0, popups.length);
        mouthElapsed = 0;
        state.mouthOpen = false;
        startLevel(1);
        lastFrame = 0;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(frame);
    }

    function startAim(x, y) {
        if (state.shotState !== "ready") return;
        aim.x = x;
        aim.y = y;
        aim.active = true;
        state.shotState = "aiming";
    }

    function updateAim(x, y) {
        if (!aim.active) return;
        aim.x = x;
        aim.y = y;
    }

    function cancelAim() {
        aim.active = false;
        if (state.shotState === "aiming") state.shotState = "ready";
    }

    function release() {
        if (!aim.active) return;
        aim.active = false;
        const { dx, dy, dist, power } = aimVector.value;
        if (dist < MAX_DRAG * 0.04 || state.sproutsLeft <= 0) {
            state.shotState = "ready";
            return;
        }
        const speed = power * MAX_LAUNCH_SPEED;
        sprout.vx = (dx / dist) * speed;
        sprout.vy = (dy / dist) * speed;
        sprout.spin = (dx / dist) * 6;
        state.shotState = "rolling";
        state.sproutsLeft -= 1;
        if (onLaunch) onLaunch(power);
    }

    function popupAt(x, y, text, big = false) {
        const id = nextId++;
        popups.push({ id, x, y, text, big });
        setTimeout(() => {
            const idx = popups.findIndex((p) => p.id === id);
            if (idx !== -1) popups.splice(idx, 1);
        }, 760);
    }

    function addPoxDot() {
        const pos = poxDotPosition(state.poxCount);
        pox.push({ id: nextId++, ...pos });
    }

    function advanceLevel() {
        levelBanner.value = true;
        setTimeout(() => {
            levelBanner.value = false;
        }, 1400);
        startLevel(state.level + 1);
        if (onLevelUp) onLevelUp(state.level);
    }

    function registerHit() {
        const speed = Math.hypot(sprout.vx, sprout.vy);
        const speedBonus = Math.round(
            Math.min(1, speed / MAX_LAUNCH_SPEED) * MAX_SPEED_BONUS
        );
        const points = BASE_POINTS + speedBonus;
        state.score += points;
        state.poxCount += 1;
        state.levelPox += 1;
        addPoxDot();
        popupAt(mouthCenter.value.x, mouthCenter.value.y, `+${points}`, true);

        if (onHit) onHit(points);

        if (state.levelPox >= poxTarget(state.level)) {
            advanceLevel();
        } else if (state.sproutsLeft > 0) {
            resetSproutToOrigin();
        } else {
            end();
        }
    }

    function registerMiss() {
        if (onMiss) onMiss();
        if (state.sproutsLeft > 0) {
            resetSproutToOrigin();
        } else {
            end();
        }
    }

    function end() {
        cancelAnimationFrame(rafId);
        rafId = null;
        state.phase = "end";
        state.shotState = "ready";
        if (state.score > highScore.value) {
            highScore.value = state.score;
            writeHighScore(state.score);
        }
        if (onEnd) onEnd(state.score, state.poxCount, state.level);
    }

    function updateMouthTimer(dt) {
        mouthElapsed += dt * 1000;
        const openMs = mouthOpenMs(state.level);
        const closedMs = mouthClosedMs(state.level);
        const cycle = openMs + closedMs;
        const t = mouthElapsed % cycle;
        // Cycle always starts closed so a fresh shot gets a beat to line up.
        state.mouthOpen = t >= closedMs;
    }

    function stepSprout(dt) {
        sprout.x += sprout.vx * dt;
        sprout.y += sprout.vy * dt;
        sprout.spin += sprout.vx * dt * 0.02;

        const decay = Math.pow(FRICTION, dt * 60);
        sprout.vx *= decay;
        sprout.vy *= decay;

        const r = sproutRadius.value;

        // Left / right walls bank the shot back inward.
        if (sprout.x - r < 0) {
            sprout.x = r;
            sprout.vx = Math.abs(sprout.vx) * WALL_RESTITUTION;
        } else if (sprout.x + r > bounds.w) {
            sprout.x = bounds.w - r;
            sprout.vx = -Math.abs(sprout.vx) * WALL_RESTITUTION;
        }

        // Bottom wall bounces the sprout back up the board.
        if (sprout.y + r > bounds.h) {
            sprout.y = bounds.h - r;
            sprout.vy = -Math.abs(sprout.vy) * WALL_RESTITUTION;
        }

        const mc = mouthCenter.value;
        const withinMouthX = Math.abs(sprout.x - mc.x) < mouthWidth.value / 2;
        const reachedMouthY = sprout.y - r <= mc.y + mouthHeight.value / 2;

        if (reachedMouthY) {
            if (withinMouthX && state.mouthOpen) {
                registerHit();
                return;
            }
            // Missed the open window, or the mouth was shut — bounce off
            // the face like any other wall.
            sprout.y = mc.y + mouthHeight.value / 2 + r;
            sprout.vy = Math.abs(sprout.vy) * WALL_RESTITUTION;
        }

        const speed = Math.hypot(sprout.vx, sprout.vy);
        if (speed < STOP_SPEED) {
            registerMiss();
        }
    }

    /** Advances the simulation by dt seconds. Called every rAF tick; also
     * exposed directly so tests can drive the game without faking rAF. */
    function step(dt) {
        updateMouthTimer(dt);
        if (state.shotState === "rolling") {
            stepSprout(dt);
        }
    }

    function frame(now) {
        if (state.phase !== "playing") return;
        if (!lastFrame) lastFrame = now;
        const dt = Math.min(0.05, (now - lastFrame) / 1000);
        lastFrame = now;

        step(dt);

        rafId = requestAnimationFrame(frame);
    }

    function reset() {
        cancelAnimationFrame(rafId);
        rafId = null;
        state.phase = "start";
    }

    onUnmounted(() => cancelAnimationFrame(rafId));

    return {
        state,
        highScore,
        levelBanner,
        sprout,
        sproutRadius,
        aim,
        aimVector,
        mouthWidth,
        mouthCenter,
        mouthHeight,
        launchOrigin,
        pox,
        popups,
        setBounds,
        start,
        startAim,
        updateAim,
        cancelAim,
        release,
        step,
        reset,
    };
}
