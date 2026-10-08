import { readFileSync } from "node:fs";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { FLOORS, lookMaterial, roomLook, WALLS } from "./roomLooks.js";

const php = readFileSync(`${process.cwd()}/app/Support/GamesWorld.php`, "utf8");

/** The names in the server's `const NAME = [...]`. */
function serverList(name) {
    return php
        .match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`))[1]
        .match(/'([a-z-]+)'/g)
        .map((id) => id.slice(1, -1));
}

describe("room looks", () => {
    it("draw every wall and floor the server's rooms may name", () => {
        expect(Object.keys(WALLS).sort()).toEqual(serverList("WALLS").sort());
        expect(Object.keys(FLOORS).sort()).toEqual(serverList("FLOORS").sort());
    });

    it("dress the sides like the back unless told otherwise", () => {
        expect(roomLook({ back: "tiles", floor: "lino" })).toEqual({
            back: WALLS.tiles,
            sides: WALLS.tiles,
            floor: FLOORS.lino,
        });
        expect(roomLook({ back: "tiles", sides: "brick" }).sides).toBe(
            WALLS.brick
        );
    });

    it("fall back to plaster and wood for a name this client doesn't know", () => {
        expect(roomLook({ back: "constructor", floor: "toString" })).toEqual({
            back: WALLS.plaster,
            sides: WALLS.plaster,
            floor: FLOORS.wood,
        });
        expect(roomLook({ back: "marble", floor: "lava" })).toEqual({
            back: WALLS.plaster,
            sides: WALLS.plaster,
            floor: FLOORS.wood,
        });
    });

    it("are the plain colour where there's no canvas to draw the pattern", () => {
        const spy = vi
            .spyOn(HTMLCanvasElement.prototype, "getContext")
            .mockReturnValue(null);
        const material = lookMaterial(THREE, WALLS.brick, 900, 450);
        spy.mockRestore();

        expect(material.map).toBeNull();
        expect(material.color.getHexString()).toBe(WALLS.brick.base.slice(1));
    });
});
