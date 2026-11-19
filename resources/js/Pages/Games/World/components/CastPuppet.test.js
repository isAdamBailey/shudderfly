import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import CastPuppet from "./CastPuppet.vue";

// jsdom has no WebGL, so this is the flat fallback: the 3D puppet itself
// is castMesh.js's, tested there.
let wrapper;

afterEach(() => wrapper?.unmount());

describe("CastPuppet", () => {
    it("draws the flat cast member where WebGL can't be had", async () => {
        wrapper = mount(CastPuppet, { props: { id: "butt", move: "walk" } });
        await flushPromises();
        await vi.dynamicImportSettled();
        await flushPromises();

        expect(wrapper.find("canvas").isVisible()).toBe(false);
        const flat = wrapper.getComponent(CastMember);
        expect(flat.props("id")).toBe("butt");
        expect(flat.props("move")).toBe("walk");
    });
});
