import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Map from "./Map.vue";

const speak = vi.fn();
const prefetchedTexts = [];

vi.mock("@/composables/aiVoice", async () => {
    const { watch } = await import("vue");
    return {
        usePrefetchAiVoice: (source) =>
            watch(source, (text) => text && prefetchedTexts.push(text), {
                immediate: true,
            }),
    };
});

vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({ speak, speaking: false }),
}));

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        t: (key, r) =>
            key === "map.place_speak"
                ? `This is ${r.name}, at ${r.address}`
                : `The address is ${r.address}`,
    }),
}));

vi.mock("@googlemaps/js-api-loader", () => ({
    setOptions: vi.fn(),
    importLibrary: vi.fn(async () => ({})),
}));

let mapClick;
let placeDetails;

const fakeGoogle = () => {
    class FakeMap {
        constructor() {
            this.controls = new Proxy({}, { get: () => [] });
        }
        addListener(event, handler) {
            if (event === "click") mapClick = handler;
            return {};
        }
        setHeadingInteractionEnabled() {}
        setTiltInteractionEnabled() {}
        setCenter() {}
        setZoom() {}
    }

    const anything = new Proxy({}, { get: (_, key) => key });

    return {
        maps: {
            Map: FakeMap,
            Marker: class {
                addListener() {
                    return {};
                }
                setMap() {}
            },
            InfoWindow: class {
                close() {}
            },
            Geocoder: class {},
            StreetViewService: class {
                getPanorama() {}
            },
            MapTypeId: anything,
            MapTypeControlStyle: anything,
            ControlPosition: anything,
            RenderingType: anything,
            event: {
                addListener: () => ({}),
                removeListener: () => {},
                clearInstanceListeners: () => {},
            },
            places: {
                PlacesServiceStatus: { OK: "OK" },
                PlacesService: class {
                    getDetails(request, callback) {
                        placeDetails = { request, callback };
                    }
                },
            },
        },
    };
};

const mountMap = async () => {
    const wrapper = mount(Map, {
        props: { latitude: 45.5, longitude: -122.6, showPlaces: true },
        attachTo: document.body,
    });
    await flushPromises();
    // The map waits a tick for its size, and the address another 100ms.
    await new Promise((resolve) => setTimeout(resolve, 250));
    await flushPromises();
    return wrapper;
};

// Google's own place card, as it shows up inside the map.
const openCard = (wrapper) => {
    const card = document.createElement("div");
    card.className = "gm-style-iw-poi";
    wrapper.element.querySelector("[style*='300px']").appendChild(card);
    return card;
};

describe("Map tapped places", () => {
    beforeEach(() => {
        vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-key");
        vi.spyOn(
            HTMLElement.prototype,
            "getBoundingClientRect"
        ).mockReturnValue({ width: 300, height: 300 });
        global.fetch = vi.fn(async () => ({
            ok: true,
            json: async () => ({ displayName: "1 Main St", lat: 45.5 }),
        }));
        window.google = fakeGoogle();
        speak.mockClear();
        prefetchedTexts.length = 0;
        mapClick = null;
        placeDetails = null;
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        delete window.google;
    });

    it("shows and speaks a tapped place until its card closes", async () => {
        const wrapper = await mountMap();
        expect(wrapper.text()).toContain("1 Main St");

        mapClick({ placeId: "place-1" });
        expect(placeDetails.request).toEqual({
            placeId: "place-1",
            fields: ["name", "formatted_address"],
        });
        const card = openCard(wrapper);
        placeDetails.callback(
            { name: "Ground Kontrol", formatted_address: "115 NW 5th Ave" },
            "OK"
        );
        await flushPromises();

        expect(wrapper.text()).toContain("Ground Kontrol 115 NW 5th Ave");
        expect(prefetchedTexts).toEqual([
            "The address is 1 Main St",
            "This is Ground Kontrol, at 115 NW 5th Ave",
        ]);
        await wrapper.find("button").trigger("click");
        expect(speak).toHaveBeenCalledWith(
            "This is Ground Kontrol, at 115 NW 5th Ave"
        );

        card.remove();
        await flushPromises();

        expect(wrapper.text()).toContain("Address: 1 Main St");
        await wrapper.find("button").trigger("click");
        expect(speak).toHaveBeenLastCalledWith("The address is 1 Main St");

        wrapper.unmount();
    });

    it("ignores a place lookup that a newer tap has replaced", async () => {
        const wrapper = await mountMap();

        mapClick({ placeId: "place-1" });
        const first = placeDetails.callback;
        mapClick({ placeId: "place-2" });
        placeDetails.callback(
            { name: "Second", formatted_address: "2 Second St" },
            "OK"
        );
        first({ name: "First", formatted_address: "1 First St" }, "OK");
        await flushPromises();

        expect(wrapper.text()).toContain("Second");
        expect(wrapper.text()).not.toContain("First");

        wrapper.unmount();
    });
});
