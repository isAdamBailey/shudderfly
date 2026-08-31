import { describe, it, expect } from "vitest";
import {
    useGamesWorld,
    WALK_SPEED,
    DRAG_SPEED,
    END_PAD,
    SNAP_RADIUS,
    SOFT_LEFT,
    SOFT_RIGHT,
} from "./useGamesWorld.js";

const DT = 1 / 60;
const STAGE_W = 800;
const STAGE_H = 600;

/** Advances the world by roughly `ms` milliseconds using fixed 60fps steps. */
function advance(world, ms) {
    for (let elapsed = 0; elapsed < ms; elapsed += DT * 1000) {
        world.step(DT);
    }
}

const GAMES = [
    {
        slug: "sprout-pox",
        name: "Sprout Pox",
        description: "Flick sprouts",
        emoji: "🥦",
        landmark: "🏥",
        distance: 600,
    },
    {
        slug: "toot-foods",
        name: "Toot Foods",
        description: "Feed the belly",
        emoji: "💨",
        landmark: "🍔",
        distance: 1500,
    },
    {
        slug: "boom",
        name: "Boom",
        description: "Blow it up",
        emoji: "💩",
        landmark: "🚽",
        distance: 2400,
    },
];

/** Drags the peach to `x` and lets it stroll the whole way there — a drag
 * steers the peach at DRAG_SPEED rather than teleporting it. */
function dragTo(world, x) {
    world.startDrag();
    world.updateDrag(x);
    advance(world, (Math.abs(x - world.peach.x) / DRAG_SPEED) * 1000 + 100);
}

/** How long the peach needs to stroll `distance` px after a release. */
function travelMs(distance) {
    return (distance / DRAG_SPEED) * 1000 + 100;
}

function makeWorld(callbacks) {
    const world = useGamesWorld(GAMES, callbacks);
    world.setBounds(STAGE_W, STAGE_H);
    return world;
}

describe("useGamesWorld landmarks and world size", () => {
    it("maps each game to a landmark positioned at its distance", () => {
        const world = makeWorld();

        expect(world.landmarks.value).toHaveLength(3);
        expect(world.landmarks.value[0]).toMatchObject({
            slug: "sprout-pox",
            name: "Sprout Pox",
            emoji: "🥦",
            landmark: "🏥",
            x: 600,
        });
    });

    it("runs the road END_PAD past the furthest landmark", () => {
        expect(makeWorld().worldWidth.value).toBe(2400 + END_PAD);
    });

    it("never makes the world narrower than the stage", () => {
        const world = useGamesWorld([{ slug: "a", distance: 100 }]);
        world.setBounds(4000, STAGE_H);

        expect(world.worldWidth.value).toBe(4000);
    });
});

describe("useGamesWorld camera", () => {
    it("holds at zero while the peach is inside the deadzone", () => {
        const world = makeWorld();

        dragTo(world, STAGE_W * 0.5);

        expect(world.peach.x).toBe(STAGE_W * 0.5);
        expect(world.camera.x).toBe(0);
    });

    it("follows the peach past the right soft margin", () => {
        const world = makeWorld();

        dragTo(world, 1000);

        expect(world.camera.x).toBe(1000 - STAGE_W * SOFT_RIGHT);
    });

    it("pushes back when the peach crosses the left soft margin", () => {
        const world = makeWorld();

        dragTo(world, 1500);
        dragTo(world, 1000);

        expect(world.camera.x).toBe(1000 - STAGE_W * SOFT_LEFT);
    });

    it("clamps at the end of the road and never goes negative", () => {
        const world = makeWorld();

        dragTo(world, world.worldWidth.value - 60);
        expect(world.camera.x).toBe(world.worldWidth.value - STAGE_W);

        dragTo(world, 40);
        expect(world.camera.x).toBe(0);
    });
});

describe("useGamesWorld walking", () => {
    it("moves the peach about WALK_SPEED px in a second", () => {
        const world = makeWorld();
        const startX = world.peach.x;

        world.setWalk(1);
        advance(world, 1000);

        // `advance` steps in whole 60fps frames, so it overshoots one second
        // by at most a frame's worth of travel.
        expect(world.peach.x - startX).toBeGreaterThanOrEqual(WALK_SPEED);
        expect(world.peach.x - startX).toBeLessThan(
            WALK_SPEED + WALK_SPEED * DT * 2
        );
        expect(world.peach.facing).toBe(1);
    });

    it("halts when the walking direction is released", () => {
        const world = makeWorld();

        world.setWalk(1);
        advance(world, 200);
        world.stopWalk(1);
        const stoppedAt = world.peach.x;
        advance(world, 500);

        expect(world.peach.x).toBe(stoppedAt);
    });

    it("ignores the release of a direction that isn't being walked", () => {
        const world = makeWorld();

        world.setWalk(1);
        world.stopWalk(-1);
        advance(world, 200);

        expect(world.state.walkDir).toBe(1);
        expect(world.peach.x).toBeGreaterThan(260);
    });

    it("drops a held direction when a drag or pan takes over", () => {
        const world = makeWorld();

        world.setWalk(1);
        world.startDrag();
        expect(world.state.walkDir).toBe(0);

        world.setWalk(1);
        world.startPan(100);
        expect(world.state.walkDir).toBe(0);
    });

    it("loops back to the start when it walks off the end of the road", () => {
        const world = makeWorld();
        const end = world.worldWidth.value - 40;

        world.setWalk(1);
        advance(world, ((end - world.peach.x) / WALK_SPEED) * 1000 + 500);

        expect(world.peach.x).toBeLessThan(400);
        expect(world.peach.x).toBeGreaterThanOrEqual(40);
    });

    it("loops round to the end when it walks back past the start", () => {
        const world = makeWorld();

        world.setWalk(-1);
        advance(world, 3000);

        expect(world.peach.x).toBeGreaterThan(world.worldWidth.value - 800);
    });
});

describe("useGamesWorld dropping the peach", () => {
    it("opens the confirm card when dropped within SNAP_RADIUS of a landmark", () => {
        const world = makeWorld();

        dragTo(world, 1500 - (SNAP_RADIUS - 10));
        world.endDrag();

        expect(world.state.confirmSlug).toBe("toot-foods");
        expect(world.state.mode).toBe("idle");
    });

    it("opens nothing when dropped on open road", () => {
        const world = makeWorld();

        dragTo(world, 1500 - (SNAP_RADIUS + 10));
        world.endDrag();

        expect(world.nearestLandmark.value).toBeNull();
        expect(world.state.confirmSlug).toBeNull();
    });

    it("opens nothing when the drag is cancelled on a landmark", () => {
        const world = makeWorld();

        dragTo(world, 1500);
        world.cancelDrag();

        expect(world.state.mode).toBe("idle");
        expect(world.peach.x).toBe(1500);
        expect(world.state.confirmSlug).toBeNull();
    });

    it("finishes the journey after the release, then opens the card", () => {
        const world = makeWorld();

        world.startDrag();
        world.updateDrag(600);
        advance(world, 200); // let go long before the peach gets there
        world.endDrag();

        expect(world.state.confirmSlug).toBeNull();
        advance(world, travelMs(600));

        expect(world.peach.x).toBe(600);
        expect(world.state.confirmSlug).toBe("sprout-pox");
    });

    it("arrives when the drag target is past the wrap boundary", () => {
        const world = makeWorld();
        world.walkToLandmark("boom");

        // Finger past the end of the road — without wrapping the target, the
        // peach would chase an unreachable coordinate forever and never arrive.
        const pastEnd = world.worldWidth.value + 40;
        const startX = world.peach.x;
        world.startDrag();
        world.updateDrag(pastEnd);
        world.endDrag();

        // Shortest wrapped path from boom (2400) to wrapX(pastEnd) (120).
        advance(world, travelMs(800));

        expect(world.peach.x).toBe(120);
        expect(world.peach.x).not.toBe(startX);
        expect(world.state.confirmSlug).toBeNull();
    });

    it("abandons an unfinished journey when the player walks instead", () => {
        const world = makeWorld();

        world.startDrag();
        world.updateDrag(600);
        world.endDrag();
        world.setWalk(-1);
        advance(world, travelMs(600));

        expect(world.state.confirmSlug).toBeNull();
    });

    it("reports the nearest landmark and notifies onArrive", () => {
        const arrivals = [];
        const world = makeWorld({ onArrive: (lm) => arrivals.push(lm.slug) });

        dragTo(world, 610);
        expect(world.nearestLandmark.value.slug).toBe("sprout-pox");
        world.endDrag();

        expect(arrivals).toEqual(["sprout-pox"]);
    });
});

describe("useGamesWorld panning", () => {
    it("moves the camera and leaves the peach alone", () => {
        const world = makeWorld();
        const peachX = world.peach.x;

        world.startPan(500);
        world.updatePan(300);
        world.endPan();

        expect(world.camera.x).toBe(200);
        expect(world.peach.x).toBe(peachX);
        expect(world.state.mode).toBe("idle");
    });

    it("clamps the pan at both ends of the road", () => {
        const world = makeWorld();

        world.startPan(5000);
        world.updatePan(0);
        expect(world.camera.x).toBe(world.worldWidth.value - STAGE_W);

        world.updatePan(9999);
        expect(world.camera.x).toBe(0);
    });
});

describe("useGamesWorld confirm card", () => {
    it("freezes the world while the card is open", () => {
        const world = makeWorld();

        world.setWalk(1);
        world.openConfirm("sprout-pox");
        const frozenAt = world.peach.x;
        advance(world, 1000);

        expect(world.peach.x).toBe(frozenAt);
    });

    it("clears any held direction when the card closes", () => {
        const world = makeWorld();

        world.setWalk(1);
        world.openConfirm("sprout-pox");
        world.closeConfirm();

        expect(world.state.confirmSlug).toBeNull();
        expect(world.state.walkDir).toBe(0);
    });

    it("walks the peach to a landmark and brings the camera along", () => {
        const world = makeWorld();

        world.walkToLandmark("boom");

        expect(world.peach.x).toBe(2400);
        expect(world.camera.x).toBe(2400 - STAGE_W * SOFT_RIGHT);
    });

    it("ignores an unknown slug", () => {
        const world = makeWorld();
        const peachX = world.peach.x;

        world.walkToLandmark("nope");
        world.openConfirm("nope");

        expect(world.peach.x).toBe(peachX);
        expect(world.state.confirmSlug).toBeNull();
    });
});

describe("useGamesWorld reduced motion", () => {
    it("advances the bob while walking by default", () => {
        const world = makeWorld();

        world.setWalk(1);
        advance(world, 200);

        expect(world.peach.bob).toBeGreaterThan(0);
    });

    it("holds the bob at rest but still walks the peach", () => {
        const world = makeWorld({ isReducedMotion: () => true });
        const startX = world.peach.x;

        world.setWalk(1);
        advance(world, 200);

        expect(world.peach.bob).toBe(0);
        expect(world.peach.x).toBeGreaterThan(startX);
    });

    it("still arrives at a landmark and opens its card", () => {
        const world = makeWorld({ isReducedMotion: () => true });

        dragTo(world, 1500);
        world.endDrag();

        expect(world.state.confirmSlug).toBe("toot-foods");
    });
});
