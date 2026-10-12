import { onBeforeUnmount, onMounted } from "vue";

/**
 * A minigame's frame loop: calls `tick(dt)` every animation frame from
 * mount, `dt` in seconds and at most a twentieth of one, so a stall (a
 * hidden tab) doesn't play a round's worth at once. `tick` returns false
 * to stop (the round is over); unmounting stops it too.
 */
export function useMinigameLoop(tick) {
    let frame = 0;
    let last = 0;

    function loop(now) {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (tick(dt) === false) {
            frame = 0;
            return;
        }
        frame = requestAnimationFrame(loop);
    }

    onMounted(() => {
        last = performance.now();
        frame = requestAnimationFrame(loop);
    });

    onBeforeUnmount(() => cancelAnimationFrame(frame));
}
