import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CollageArt from "./CollageArt.vue";

describe("CollageArt", () => {
    it("hangs every one of the collage's pictures, in order", () => {
        const tiles = ["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg", "/e.jpg"];
        const wrapper = mount(CollageArt, {
            props: { tiles, cols: 3, rows: 2 },
        });

        expect(
            wrapper.findAll("img").map((img) => img.attributes("src"))
        ).toEqual(tiles);
    });
});
