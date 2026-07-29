import { describe, it, expect, beforeEach } from "vitest";
import {
    useSproutGame,
    poxTarget,
    TOTAL_SPROUTS,
    mouthOpenMs,
    mouthClosedMs,
} from "./useSproutGame.js";

const DT = 1 / 60;

/** Advances the game by roughly `ms` milliseconds using fixed 60fps steps. */
function advance(game, ms) {
    for (let elapsed = 0; elapsed < ms; elapsed += DT * 1000) {
        game.step(DT);
    }
}

function aimStraightUp(game, power = 1) {
    const origin = game.launchOrigin.value;
    game.startAim(origin.x, origin.y);
    // Pull straight down from the origin so the shot fires straight up.
    game.updateAim(origin.x, origin.y + power * 150);
}

describe("useSproutGame level tuning", () => {
    it("increases the pox quota each level", () => {
        expect(poxTarget(1)).toBe(3);
        expect(poxTarget(2)).toBe(4);
    });

    it("shortens the open window and lengthens the closed window as levels rise", () => {
        expect(mouthOpenMs(3)).toBeLessThan(mouthOpenMs(1));
        expect(mouthClosedMs(3)).toBeGreaterThan(mouthClosedMs(1));
    });
});

describe("useSproutGame", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("scores a hit and adds one pox dot when the sprout arrives while the mouth is open", () => {
        const game = useSproutGame();
        game.setBounds(400, 700);
        game.start();

        // Let the mouth open before firing so the shot is guaranteed to
        // land inside the open window.
        advance(game, mouthClosedMs(1) + 20);
        aimStraightUp(game, 1);
        game.release();
        expect(game.state.shotState).toBe("rolling");

        advance(game, 1500);

        expect(game.state.poxCount).toBe(1);
        expect(game.pox.length).toBe(1);
        expect(game.pox[0]).toMatchObject({ x: expect.any(Number) });
    });

    it("does not score when the sprout arrives while the mouth is shut", () => {
        const game = useSproutGame();
        game.setBounds(400, 700);
        game.start();

        // Fire immediately: the mouth starts closed and stays closed for
        // mouthClosedMs(1), which is longer than the sprout's travel time.
        aimStraightUp(game, 1);
        game.release();
        advance(game, mouthClosedMs(1) - 30);

        expect(game.state.poxCount).toBe(0);
        expect(game.state.mouthOpen).toBe(false);
    });

    it("advances to the next level once the pox quota is cleared, without granting more sprouts", () => {
        const game = useSproutGame();
        game.setBounds(400, 700);
        game.start();

        const sproutsBefore = game.state.sproutsLeft;
        const target = poxTarget(1);
        for (let hit = 0; hit < target; hit++) {
            advance(game, mouthClosedMs(game.state.level) + 20);
            aimStraightUp(game, 1);
            game.release();
            advance(game, 1500);
        }

        expect(game.state.level).toBe(2);
        expect(game.state.levelPox).toBe(0);
        // The shared sprout pool only ever goes down (one per shot), never
        // back up on a level change.
        expect(game.state.sproutsLeft).toBe(sproutsBefore - target);
    });

    it("ends the game and records a high score once the fixed sprout pool runs out", () => {
        const game = useSproutGame();
        game.setBounds(400, 700);
        game.start();

        expect(game.state.sproutsLeft).toBe(TOTAL_SPROUTS);

        let guard = 0;
        while (game.state.phase === "playing" && guard < TOTAL_SPROUTS + 2) {
            guard += 1;
            const origin = game.launchOrigin.value;
            game.startAim(origin.x, origin.y);
            game.updateAim(origin.x - 150, origin.y);
            game.release();
            // Force an immediate near-stop so the shot settles as a miss on
            // the next step, rather than depending on how many times a
            // slingshot with this restitution happens to bounce off the
            // walls before crossing the stop-speed threshold.
            game.sprout.vx = 1;
            game.sprout.vy = 1;
            advance(game, 100);
        }

        expect(game.state.phase).toBe("end");
        expect(game.state.sproutsLeft).toBe(0);
        if (game.state.score > 0) {
            expect(localStorage.getItem("sproutPoxHighScore")).toBe(
                String(game.state.score)
            );
        }
    });
});
