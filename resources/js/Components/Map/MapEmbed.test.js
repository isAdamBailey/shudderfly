import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MapEmbed from "./MapEmbed.vue";

const MapStub = {
    name: "Map",
    props: ["showPlaces"],
    template: "<div />",
};

const mountEmbed = (props = {}) =>
    mount(MapEmbed, {
        props: { latitude: 45.5, longitude: -122.6, ...props },
        global: { stubs: { Map: MapStub } },
    });

describe("MapEmbed", () => {
    it("lets places on the map be tapped", () => {
        const wrapper = mountEmbed();

        expect(wrapper.findComponent(MapStub).props("showPlaces")).toBe(true);
    });

    it("shows no map without a location", () => {
        const wrapper = mountEmbed({ latitude: null, longitude: null });

        expect(wrapper.findComponent(MapStub).exists()).toBe(false);
    });
});
