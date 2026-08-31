import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import TiltPermissionButton from "./TiltPermissionButton.vue";

vi.mock("@inertiajs/vue3", () => ({
    usePage: () => ({
        props: {
            translations: { "general.enable_tilt": "Tilt to look around" },
        },
    }),
}));

/** Installs an iOS-shaped DeviceOrientationEvent whose gate resolves to
 * `result`; omit it entirely for the engines that need no permission. */
function stubIos(result) {
    const requestPermission = vi.fn(() => Promise.resolve(result));
    vi.stubGlobal("DeviceOrientationEvent", { requestPermission });
    return requestPermission;
}

function stubReducedMotion(reduce) {
    vi.stubGlobal("matchMedia", (query) => ({
        matches: query.includes("reduce") ? reduce : !reduce,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent: () => false,
    }));
}

beforeEach(() => {
    window.localStorage.clear();
    stubReducedMotion(false);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("TiltPermissionButton", () => {
    it("renders nothing where orientation needs no permission", async () => {
        vi.stubGlobal("DeviceOrientationEvent", {});

        const wrapper = mount(TiltPermissionButton);
        await nextTick();

        expect(wrapper.find("button").exists()).toBe(false);
    });

    it("offers the gesture on iOS", async () => {
        stubIos("granted");

        const wrapper = mount(TiltPermissionButton);
        await nextTick();

        expect(wrapper.find("button").text()).toContain("Tilt to look around");
    });

    it("asks Safari for permission when tapped, then gets out of the way", async () => {
        const requestPermission = stubIos("granted");
        const wrapper = mount(TiltPermissionButton);
        await nextTick();

        await wrapper.find("button").trigger("click");
        await vi.waitFor(() =>
            expect(wrapper.find("button").exists()).toBe(false)
        );

        expect(requestPermission).toHaveBeenCalledOnce();
    });

    it("does not ask for a sensor whose data reduced motion discards", async () => {
        stubIos("granted");
        stubReducedMotion(true);

        const wrapper = mount(TiltPermissionButton);
        await nextTick();

        expect(wrapper.find("button").exists()).toBe(false);
    });

    it("gets out of the way when the sheet is refused", async () => {
        stubIos("denied");
        const wrapper = mount(TiltPermissionButton);
        await nextTick();

        await wrapper.find("button").trigger("click");
        await vi.waitFor(() =>
            expect(wrapper.find("button").exists()).toBe(false)
        );
    });
});
