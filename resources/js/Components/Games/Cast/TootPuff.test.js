import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { GUSTER_COLORS } from "@/constants/characters.js";
import TootPuff from "./TootPuff.vue";

describe("TootPuff", () => {
    it("is plain for most of the cast", () => {
        const puff = mount(TootPuff, { props: { castId: "butt" } });
        expect(puff.classes()).not.toContain("toot-puff-guster");
    });

    it("is in Guster's greens when he toots", () => {
        const puff = mount(TootPuff, { props: { castId: "guster" } });
        expect(puff.classes()).toContain("toot-puff-guster");
        expect(puff.attributes("style")).toContain(GUSTER_COLORS.highlight);
    });
});
