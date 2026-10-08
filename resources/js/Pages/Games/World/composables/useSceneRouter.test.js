import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useSceneRouter } from "./useSceneRouter.js";

const road = { kind: "road", interactables: [] };

describe("useSceneRouter", () => {
    it("starts on the road", () => {
        const router = useSceneRouter({ road });

        expect(router.current.value).toBe(road);
    });

    it("follows a reactive registry", () => {
        const registry = ref({});
        const router = useSceneRouter(registry);

        expect(router.current.value).toBeNull();
        registry.value = { road };
        // A ref wraps what it holds in a reactive proxy, so compare by value.
        expect(router.current.value).toEqual(road);
    });
});
