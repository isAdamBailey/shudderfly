import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { GUSTER_COLORS } from "@/constants/characters.js";
import { serverList } from "../testing/serverList.js";
import { building, DOORS } from "./streetGeometry.js";

const LOOK = {
    walls: ["#ffffff"],
    roofs: ["#000000"],
    trim: "#cccccc",
    glass: "#99ccff",
};

/** Whether any vertex of `parts` is painted `color`. */
function painted(parts, color) {
    const c = new THREE.Color(color);
    return parts.some((part) => {
        const colors = part.attributes.color.array;
        for (let i = 0; i < colors.length; i += 3) {
            if (
                Math.abs(colors[i] - c.r) < 1e-6 &&
                Math.abs(colors[i + 1] - c.g) < 1e-6 &&
                Math.abs(colors[i + 2] - c.b) < 1e-6
            )
                return true;
        }
        return false;
    });
}

function house(door) {
    return building(THREE, {
        width: 200,
        height: 160,
        depth: 120,
        roof: 60,
        look: LOOK,
        palette: 0,
        door,
    }).body;
}

describe("street geometry", () => {
    it("hangs lights under the eaves only for a look with bulbs", () => {
        const parts = (look) =>
            building(THREE, {
                width: 200,
                height: 160,
                depth: 120,
                roof: 60,
                look,
                palette: 0,
            }).bulbs;
        const lit = parts({ ...LOOK, bulbs: ["#ff0000", "#00ff00"] });

        expect(parts(LOOK)).toEqual([]);
        expect(lit.length).toBeGreaterThan(2);
        expect(painted(lit, "#ff0000")).toBe(true);
        expect(painted(lit, "#00ff00")).toBe(true);
    });

    it("leaves the middle of the eaves clear for the sign", () => {
        const lit = building(THREE, {
            width: 200,
            height: 160,
            depth: 120,
            roof: 60,
            look: { ...LOOK, bulbs: ["#ff0000"] },
            palette: 0,
        }).bulbs;
        const centres = lit.map((part) => {
            part.computeBoundingBox();
            return part.boundingBox.getCenter(new THREE.Vector3()).x;
        });

        expect(centres.some((x) => x < 0)).toBe(true);
        expect(centres.some((x) => x > 0)).toBe(true);
        expect(Math.min(...centres.map(Math.abs))).toBeGreaterThan(30);
    });

    it("draws every front door the server's road may name", () => {
        const named = Object.keys(DOORS).filter((name) => name !== "plain");

        expect(named.sort()).toEqual(serverList("DOORS").sort());
    });

    it("hangs Guster's door in his greens, and the plain one otherwise", () => {
        expect(painted(house("guster"), GUSTER_COLORS.mid)).toBe(true);
        expect(painted(house("guster"), DOORS.plain.wood)).toBe(false);
        expect(painted(house("plain"), DOORS.plain.wood)).toBe(true);
        expect(painted(house("nonsense"), DOORS.plain.wood)).toBe(true);
        expect(painted(house(null), DOORS.plain.wood)).toBe(false);
    });
});
