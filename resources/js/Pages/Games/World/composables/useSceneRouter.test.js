import { beforeEach, describe, expect, it } from "vitest";
import { ref } from "vue";
import { useSceneRouter } from "./useSceneRouter.js";

const road = {
    kind: "road",
    interactables: [{ id: "house", type: "door", to: "house.hall" }],
};
const hall = {
    kind: "room",
    interactables: [
        { id: "kitchen-door", type: "door", to: "house.kitchen" },
        {
            id: "front-door",
            type: "door",
            to: "road",
            toSpot: "house",
            exit: true,
        },
    ],
};
const kitchen = {
    kind: "room",
    interactables: [
        { id: "hall-door", type: "door", to: "house.hall", exit: true },
    ],
};
const scenes = { road, "house.hall": hall, "house.kitchen": kitchen };

/** A Storage in memory, or one whose every call throws. */
function memoryStorage(initial = {}) {
    const data = { ...initial };
    return {
        data,
        getItem: (key) => data[key] ?? null,
        setItem: (key, value) => {
            data[key] = value;
        },
    };
}
const brokenStorage = {
    getItem() {
        throw new Error("SecurityError");
    },
    setItem() {
        throw new Error("QuotaExceededError");
    },
};
const saved = (place) =>
    memoryStorage({ "games-world.place": JSON.stringify(place) });

describe("useSceneRouter", () => {
    let storage;
    beforeEach(() => {
        storage = memoryStorage();
    });

    it("starts on the road", () => {
        const router = useSceneRouter(scenes, { storage });

        expect(router.current.value).toBe(road);
        expect(router.arrival.value).toEqual({});
    });

    it("follows a reactive registry", () => {
        const registry = ref({});
        const router = useSceneRouter(registry, { storage });

        expect(router.current.value).toBeNull();
        registry.value = { road };
        // A ref wraps what it holds in a reactive proxy, so compare by value.
        expect(router.current.value).toEqual(road);
    });

    it("goes through a door to its spot, and remembers the scene", () => {
        const router = useSceneRouter(scenes, { storage });

        expect(router.goTo("house.hall", { spot: "front-door" })).toBe(true);

        expect(router.current.value).toBe(hall);
        expect(router.arrival.value).toEqual({ spot: "front-door" });
        expect(JSON.parse(storage.data["games-world.place"])).toMatchObject({
            scene: "house.hall",
        });
    });

    it("refuses a scene that doesn't exist", () => {
        const router = useSceneRouter(scenes, { storage });

        expect(router.goTo("house.attic")).toBe(false);
        expect(router.goTo("constructor")).toBe(false);
        expect(router.current.value).toBe(road);
    });

    it("leaves a room by the door back to where you came from", () => {
        const router = useSceneRouter(scenes, { storage });
        expect(router.exitDoor()).toBeNull();

        router.goTo("house.hall");
        expect(router.exitDoor().id).toBe("front-door");

        router.goTo("house.kitchen");
        expect(router.exitDoor().id).toBe("hall-door");

        // Back in the hall from the kitchen, the way out is still the road.
        router.goTo("house.hall");
        expect(router.exitDoor().id).toBe("front-door");
    });

    it("leaves by the room's exit with no history, not its first door", () => {
        const router = useSceneRouter(scenes, {
            storage: saved({ scene: "house.hall" }),
        });

        expect(router.exitDoor().id).toBe("front-door");
    });

    it("goes out room by room from an inner room, never back in", () => {
        // A link or reload into the kitchen: no history to retrace.
        const router = useSceneRouter(scenes, {
            storage: saved({ scene: "house.kitchen" }),
        });

        router.goTo(router.exitDoor().to);
        expect(router.currentId.value).toBe("house.hall");
        expect(router.exitDoor().id).toBe("front-door");
    });

    it("restores the saved scene and position", () => {
        const router = useSceneRouter(scenes, {
            storage: saved({
                scene: "road",
                position: { x: 900, side: "near" },
            }),
        });

        expect(router.current.value).toBe(road);
        expect(router.arrival.value).toEqual({
            position: { x: 900, side: "near" },
        });
    });

    it("saves the position it is given", () => {
        const router = useSceneRouter(scenes, { storage });

        router.remember({ x: 1200, side: "far" });

        expect(JSON.parse(storage.data["games-world.place"])).toEqual({
            scene: "road",
            position: { x: 1200, side: "far" },
            visit: null,
        });
    });

    it("ignores a saved scene that no longer exists, or junk", () => {
        for (const junk of [
            saved({ scene: "house.attic" }),
            saved("road"),
            memoryStorage({ "games-world.place": "{not json" }),
        ]) {
            const router = useSceneRouter(scenes, { storage: junk });
            expect(router.current.value).toBe(road);
            expect(router.arrival.value).toEqual({});
        }
    });

    it("opens on the road when storage throws, and still moves", () => {
        const router = useSceneRouter(scenes, { storage: brokenStorage });

        expect(router.current.value).toBe(road);
        expect(router.goTo("house.hall")).toBe(true);
        expect(() => router.remember({ x: 1 })).not.toThrow();
        expect(router.current.value).toBe(hall);
    });

    it("opens where a shared link says, over the saved place", () => {
        const router = useSceneRouter(scenes, {
            link: { scene: "house.hall", visit: "a" },
            storage: saved({ scene: "road", position: { x: 900 } }),
        });

        expect(router.current.value).toBe(hall);
        expect(router.arrival.value).toEqual({});
    });

    it("comes back to the saved place, not the link, once the link was used", () => {
        const store = memoryStorage();
        const first = useSceneRouter(scenes, {
            link: "house.hall",
            storage: store,
        });
        first.goTo("road", { spot: "house" });
        first.remember({ x: 3300, side: "far" });

        // Back from a game, at the same /games?scene=house.hall.
        const again = useSceneRouter(scenes, {
            link: "house.hall",
            storage: store,
        });

        expect(again.current.value).toBe(road);
        expect(again.arrival.value).toEqual({
            position: { x: 3300, side: "far" },
        });
    });

    it("stands at the spot a link names", () => {
        const router = useSceneRouter(scenes, {
            link: { scene: "house.hall", spot: "front-door", visit: "a" },
            storage: memoryStorage(),
        });

        expect(router.currentId.value).toBe("house.hall");
        expect(router.arrival.value).toEqual({ spot: "front-door" });
    });

    it("ignores a link to a scene that doesn't exist", () => {
        const router = useSceneRouter(scenes, {
            link: { scene: "house.attic", visit: "a" },
            storage,
        });

        expect(router.current.value).toBe(road);
    });

    it("arrives again where it is told, staying in the scene", () => {
        const router = useSceneRouter(scenes, { storage });
        router.goTo("house.hall", { spot: "front-door" });

        router.stay({ x: 1 });
        expect(router.current.value).toBe(hall);
        expect(router.arrival.value).toEqual({ position: { x: 1 } });

        router.stay(null);
        expect(router.arrival.value).toEqual({});
    });
});
