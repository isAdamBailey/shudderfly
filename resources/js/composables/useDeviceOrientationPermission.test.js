import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { useDeviceOrientationPermission } from "./useDeviceOrientationPermission";

/** The composable reads DeviceOrientationEvent on mount, so every case has to
 * run inside a real component rather than being called bare. */
function mountComposable() {
    let api;
    const wrapper = mount(
        defineComponent({
            setup() {
                api = useDeviceOrientationPermission();
                return () => null;
            },
        })
    );
    return { api, wrapper };
}

/** Installs an iOS-shaped DeviceOrientationEvent whose gate resolves to
 * `result`, or rejects when `result` is an Error. */
function stubIos(result) {
    const requestPermission = vi.fn(() =>
        result instanceof Error
            ? Promise.reject(result)
            : Promise.resolve(result)
    );
    vi.stubGlobal("DeviceOrientationEvent", { requestPermission });
    return requestPermission;
}

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("useDeviceOrientationPermission", () => {
    it("stays out of the way when the engine has no orientation event", () => {
        vi.stubGlobal("DeviceOrientationEvent", undefined);

        const { api } = mountComposable();

        expect(api.needsPermission.value).toBe(false);
    });

    it("stays out of the way when orientation needs no permission", () => {
        // Every non-iOS engine: the constructor exists, the gate does not.
        vi.stubGlobal("DeviceOrientationEvent", {});

        const { api } = mountComposable();

        expect(api.needsPermission.value).toBe(false);
    });

    it("asks for a gesture on iOS", () => {
        stubIos("granted");

        const { api } = mountComposable();

        expect(api.needsPermission.value).toBe(true);
    });

    it("records a grant and stops asking", async () => {
        const requestPermission = stubIos("granted");
        const { api } = mountComposable();

        await expect(api.request()).resolves.toBe(true);

        expect(requestPermission).toHaveBeenCalledOnce();
        expect(api.needsPermission.value).toBe(false);
    });

    it("records a refusal and stops asking", async () => {
        stubIos("denied");
        const { api } = mountComposable();

        await expect(api.request()).resolves.toBe(false);

        expect(api.needsPermission.value).toBe(false);
    });

    it("keeps the button up when Safari rejects for want of a gesture", async () => {
        stubIos(new Error("requires a user gesture"));
        const { api } = mountComposable();

        await expect(api.request()).resolves.toBe(false);

        expect(api.needsPermission.value).toBe(true);
    });

    it("re-grants silently on a return visit without showing a button", async () => {
        const requestPermission = stubIos("granted");
        const { api } = mountComposable();
        await api.request();

        // Second visit: the stored grant should replay the call itself.
        const second = mountComposable();
        await vi.waitFor(() =>
            expect(second.api.needsPermission.value).toBe(false)
        );

        expect(requestPermission).toHaveBeenCalledTimes(2);
    });

    it("asks again when the earlier answer was a refusal", async () => {
        stubIos("denied");
        const { api } = mountComposable();
        await api.request();

        const second = mountComposable();

        expect(second.api.needsPermission.value).toBe(true);
    });

    it("survives localStorage throwing in a privacy mode", async () => {
        stubIos("granted");
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("denied");
        });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("denied");
        });

        const { api } = mountComposable();

        expect(api.needsPermission.value).toBe(true);
        await expect(api.request()).resolves.toBe(true);
        expect(api.needsPermission.value).toBe(false);
    });
});
