import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@inertiajs/vue3", () => ({
    usePage: vi.fn(),
}));

import GhostDrift from "@/Components/GhostDrift.vue";
import { usePage } from "@inertiajs/vue3";

const mockMatchMedia = (reduced) => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: reduced });
};

describe("GhostDrift", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockMatchMedia(false);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("does not render outside the halloween theme", async () => {
        usePage.mockReturnValue({ props: { theme: "christmas" } });

        const wrapper = mount(GhostDrift);
        await vi.advanceTimersByTimeAsync(60000);

        expect(wrapper.find(".ghost-drift").exists()).toBe(false);
    });

    it("spawns ghosts over time during halloween", async () => {
        usePage.mockReturnValue({ props: { theme: "halloween" } });

        const wrapper = mount(GhostDrift);
        expect(wrapper.find(".ghost-drift").exists()).toBe(true);
        expect(wrapper.findAll(".ghost-track")).toHaveLength(0);

        await vi.advanceTimersByTimeAsync(25000);

        expect(wrapper.findAll(".ghost-track").length).toBeGreaterThan(0);
        expect(wrapper.find(".ghost").text()).toBe("👻");
    });

    it("removes a ghost once its drift animation ends", async () => {
        usePage.mockReturnValue({ props: { theme: "halloween" } });

        const wrapper = mount(GhostDrift);
        await vi.advanceTimersByTimeAsync(25000);

        const tracks = wrapper.findAll(".ghost-track");
        await tracks[0].trigger("animationend");

        expect(wrapper.findAll(".ghost-track")).toHaveLength(tracks.length - 1);
    });

    it("does not spawn ghosts when reduced motion is preferred", async () => {
        mockMatchMedia(true);
        usePage.mockReturnValue({ props: { theme: "halloween" } });

        const wrapper = mount(GhostDrift);
        await vi.advanceTimersByTimeAsync(60000);

        expect(wrapper.findAll(".ghost-track")).toHaveLength(0);
    });
});
