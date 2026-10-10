import { reactive } from "vue";

const POINTS_PER_HISS = 10;
const COMBO_BONUS = 5;
const COMBO_WINDOW_MS = 1000;
const MOVE_X_MIN = 4;
const MOVE_X_MAX = 10;
const STEER_Y_MIN = 2;
const STEER_Y_MAX = 6;
const WIN_THRESHOLD_PERCENT = 75;

export function useGameState() {
    const state = reactive({
        phase: "start",
        score: 0,
        hissCount: 0,
        comboCount: 0,
        lastHissTime: 0,
        cockroachX: 15,
        cockroachY: 45,
        cockroachRotation: 0,
        isHissing: false,
        showFart: false,
    });

    function startGame() {
        state.phase = "playing";
        state.score = 0;
        state.hissCount = 0;
        state.comboCount = 0;
        state.lastHissTime = 0;
        state.cockroachX = 15;
        state.cockroachY = 45;
        state.cockroachRotation = 0;
        state.isHissing = false;
        state.showFart = false;
    }

    function hiss(direction) {
        if (state.phase !== "playing") return false;

        const now = Date.now();
        let bonus = 0;

        if (now - state.lastHissTime < COMBO_WINDOW_MS) {
            state.comboCount++;
            bonus = COMBO_BONUS * state.comboCount;
        } else {
            state.comboCount = 0;
        }

        state.lastHissTime = now;
        state.hissCount++;
        state.score += POINTS_PER_HISS + bonus;

        const dx = MOVE_X_MIN + Math.random() * (MOVE_X_MAX - MOVE_X_MIN);
        const steerAmount =
            STEER_Y_MIN + Math.random() * (STEER_Y_MAX - STEER_Y_MIN);
        const dy = direction === "up" ? -steerAmount : steerAmount;
        state.cockroachX = Math.min(state.cockroachX + dx, 85);
        state.cockroachY = Math.max(15, Math.min(80, state.cockroachY + dy));
        state.cockroachRotation = direction === "up" ? -15 : 15;

        state.isHissing = true;
        setTimeout(() => {
            state.isHissing = false;
            state.cockroachRotation = 0;
        }, 900);

        if (state.cockroachX >= WIN_THRESHOLD_PERCENT) {
            setTimeout(() => triggerWin(), 300);
        }

        return true;
    }

    function triggerWin() {
        state.showFart = true;
        setTimeout(() => {
            state.phase = "win";
        }, 3000);
    }

    return { state, startGame, hiss };
}
