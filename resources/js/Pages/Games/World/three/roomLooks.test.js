import { readFileSync } from "node:fs";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import {
    FLOORS,
    lookMaterial,
    roomDaylight,
    roomDecorations,
    roomLook,
    WALLS,
} from "./roomLooks.js";
import { serverList } from "../testing/serverList.js";

describe("room looks", () => {
    it("draw every wall and floor the server's rooms may name", () => {
        expect(Object.keys(WALLS).sort()).toEqual(serverList("WALLS").sort());
        expect(Object.keys(FLOORS).sort()).toEqual(serverList("FLOORS").sort());
    });

    it("dress the sides like the back, and the front like the sides, unless told otherwise", () => {
        expect(roomLook({ back: "tiles", floor: "lino" })).toEqual({
            back: WALLS.tiles,
            sides: WALLS.tiles,
            front: WALLS.tiles,
            floor: FLOORS.lino,
        });
        const sided = roomLook({ back: "tiles", sides: "brick" });
        expect(sided.sides).toBe(WALLS.brick);
        expect(sided.front).toBe(WALLS.brick);
        expect(
            roomLook({ back: "tiles", sides: "brick", front: "stone" }).front
        ).toBe(WALLS.stone);
    });

    it("fall back to plaster and wood for a name this client doesn't know", () => {
        expect(roomLook({ back: "constructor", floor: "toString" })).toEqual({
            back: WALLS.plaster,
            sides: WALLS.plaster,
            front: WALLS.plaster,
            floor: FLOORS.wood,
        });
        expect(roomLook({ back: "marble", floor: "lava" })).toEqual({
            back: WALLS.plaster,
            sides: WALLS.plaster,
            front: WALLS.plaster,
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

    it("dress every room for every seasonal theme the server can send", () => {
        const middleware = readFileSync(
            `${process.cwd()}/app/Http/Middleware/HandleInertiaRequests.php`,
            "utf8"
        );
        const themes = middleware
            .match(/const THEMES = \[([^\]]*)\]/)[1]
            .match(/'([a-z]+)'/g)
            .map((name) => name.slice(1, -1));

        for (const theme of themes) {
            expect(roomDaylight(theme), theme).not.toBe(roomDaylight(""));
            const decorations = roomDecorations(theme);
            expect(decorations.length, theme).toBeGreaterThan(0);
            for (const d of decorations) {
                expect(d.u).toBeGreaterThan(0);
                expect(d.u).toBeLessThan(1);
                expect(d.v).toBeLessThanOrEqual(1);
            }
        }
        expect(roomDecorations("")).toEqual([]);
        expect(roomDecorations("constructor")).toEqual([]);
        expect(roomDaylight("toString")).toBe(roomDaylight(""));
    });
});
