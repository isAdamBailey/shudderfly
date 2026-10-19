import { describe, expect, it, vi } from "vitest";
import { nextTick, ref, shallowRef } from "vue";
import { doorToward, useFollow } from "./useFollow.js";

const door = (id, to) => ({ id, type: "door", to });

// The road, a house with a hall and a kitchen off it, and a shed nobody
// can reach.
const SCENES = {
    road: { interactables: [door("house", "house.hall"), { id: "toy" }] },
    "house.hall": {
        interactables: [
            door("front-door", "road"),
            door("kitchen-door", "house.kitchen"),
        ],
    },
    "house.kitchen": { interactables: [door("hall-door", "house.hall")] },
    shed: { interactables: [] },
};

describe("doorToward", () => {
    it("finds the first door of the shortest way", () => {
        expect(doorToward(SCENES, "road", "house.hall").id).toBe("house");
        expect(doorToward(SCENES, "road", "house.kitchen").id).toBe("house");
        expect(doorToward(SCENES, "house.kitchen", "road").id).toBe(
            "hall-door"
        );
        expect(doorToward(SCENES, "house.hall", "house.kitchen").id).toBe(
            "kitchen-door"
        );
    });

    it("finds none where there's no way, or no need", () => {
        expect(doorToward(SCENES, "road", "shed")).toBeNull();
        expect(doorToward(SCENES, "road", "nowhere")).toBeNull();
        expect(doorToward(SCENES, "road", "road")).toBeNull();
    });
});

describe("useFollow", () => {
    function setup({ canEnter } = {}) {
        const roster = ref([{ id: 8, name: "Friend", scene: "road" }]);
        const others = ref([]);
        const currentId = ref("road");
        const api = { walkUpTo: vi.fn(), walkThrough: vi.fn() };
        const mounted = shallowRef(api);
        const busy = ref(false);
        const follow = useFollow({
            presence: { roster, others },
            scenes: () => SCENES,
            currentId,
            scene: () => mounted.value,
            busy: () => busy.value,
            canEnter,
        });
        return { follow, roster, others, currentId, api, mounted, busy };
    }

    const at = (x, z = 0) => ({ id: 8, name: "Friend", x, z, lane: 0 });

    it("walks up to them in the same scene, and after them as they move", async () => {
        const { follow, others, api } = setup();
        others.value = [at(900)];

        follow.start(8);
        await nextTick();
        expect(api.walkUpTo).toHaveBeenLastCalledWith(at(900));

        others.value = [at(1200)];
        await nextTick();
        expect(api.walkUpTo).toHaveBeenLastCalledWith(at(1200));
        expect(api.walkThrough).not.toHaveBeenCalled();
    });

    it("waits to see them before walking anywhere", async () => {
        const { follow, others, api } = setup();

        follow.start("8");
        await nextTick();
        expect(api.walkUpTo).not.toHaveBeenCalled();

        others.value = [at(400)];
        await nextTick();
        expect(api.walkUpTo).toHaveBeenCalledOnce();
    });

    it("goes through the doors toward the scene they're in", async () => {
        const { follow, roster, currentId, api, mounted, busy } = setup();
        roster.value = [{ id: 8, name: "Friend", scene: "house.kitchen" }];

        follow.start(8);
        await nextTick();
        expect(api.walkThrough).toHaveBeenLastCalledWith(
            SCENES.road.interactables[0]
        );

        // Between scenes: nothing until the hall is up.
        busy.value = true;
        mounted.value = null;
        currentId.value = "house.hall";
        await nextTick();
        expect(api.walkThrough).toHaveBeenCalledOnce();

        mounted.value = api;
        busy.value = false;
        await nextTick();
        expect(api.walkThrough).toHaveBeenLastCalledWith(
            SCENES["house.hall"].interactables[1]
        );
    });

    it("stops when they leave the world", async () => {
        const { follow, roster } = setup();
        follow.start(8);
        await nextTick();

        roster.value = [];
        await nextTick();

        expect(follow.following.value).toBeNull();
    });

    it("stops when the way there can't be gone or drawn", async () => {
        const unreachable = setup();
        unreachable.roster.value = [{ id: 8, name: "F", scene: "shed" }];
        unreachable.follow.start(8);
        await nextTick();
        expect(unreachable.follow.following.value).toBeNull();

        const noWebgl = setup({ canEnter: (id) => id === "road" });
        noWebgl.roster.value = [{ id: 8, name: "F", scene: "house.hall" }];
        noWebgl.follow.start(8);
        await nextTick();
        expect(noWebgl.follow.following.value).toBeNull();
        expect(noWebgl.api.walkThrough).not.toHaveBeenCalled();
    });

    it("tries again when nudged, after a walk was refused", async () => {
        const { follow, others, api } = setup();
        others.value = [at(900)];
        follow.start(8);
        await nextTick();

        follow.nudge();

        expect(api.walkUpTo).toHaveBeenCalledTimes(2);
    });

    it("does nothing more once stopped", async () => {
        const { follow, others, api } = setup();
        follow.start(8);
        follow.stop();
        others.value = [at(900)];
        await nextTick();

        expect(api.walkUpTo).not.toHaveBeenCalled();
    });
});
