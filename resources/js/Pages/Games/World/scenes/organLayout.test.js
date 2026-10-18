import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
    convexHull,
    KEY_COUNT,
    keyAt,
    keyX,
    ORGAN,
    zoneCorners,
} from "./organLayout.js";
import { itemPoint } from "./roomLayout.js";

const organ = { id: "organ", type: "organ", wall: "left", x: 0, z: 200 };

describe("the pipe organ's layout", () => {
    it("has a zone for each of GamesWorld::ORGAN_ZONES", () => {
        const php = readFileSync(
            `${process.cwd()}/app/Support/GamesWorld.php`,
            "utf8"
        );
        const zones = php
            .match(/const ORGAN_ZONES = \[([^\]]*)\]/)[1]
            .match(/'([^']+)'/g);
        expect(zones).toHaveLength(ORGAN.zones);
    });

    it("lays its keys out within the keyboard, deep to squeaky", () => {
        expect(keyX(0)).toBeGreaterThan(ORGAN.keys.from);
        expect(keyX(KEY_COUNT - 1)).toBeLessThan(ORGAN.keys.to);
        expect(keyX(1)).toBeGreaterThan(keyX(0));
    });

    it("stands out of the left wall into the room, deep notes to the front", () => {
        const back = itemPoint(organ, [0, 0, 0]);
        const front = itemPoint(organ, [0, 0, ORGAN.keys.front]);
        expect(back.x).toBeCloseTo(3);
        expect(front.x).toBeGreaterThan(back.x);
        expect(front.z).toBeCloseTo(back.z);

        // Deep notes toward the open front (along local -x).
        const deep = itemPoint(organ, [keyX(0), 0, 0]);
        const squeaky = itemPoint(organ, [keyX(KEY_COUNT - 1), 0, 0]);
        expect(deep.z).toBeGreaterThan(squeaky.z);
    });

    it("covers each zone's keys with eight corners", () => {
        const corners = zoneCorners(organ, 2);
        expect(corners).toHaveLength(8);
        const zs = corners.map((p) => p.z);
        expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(
            (ORGAN.keys.to - ORGAN.keys.from) / ORGAN.zones
        );
    });

    it("finds the key a press lands on, anywhere across its depth", () => {
        const on = (zone, n, depth) => {
            const p = itemPoint(organ, [
                keyX(zone * ORGAN.whiteKeys + n),
                ORGAN.keys.y,
                depth,
            ]);
            return keyAt(organ, zone, p);
        };
        for (const depth of [ORGAN.keys.back + 1, ORGAN.keys.front - 1]) {
            expect(on(0, 0, depth)).toBe(0);
            expect(on(2, 4, depth)).toBe(4);
            expect(on(3, 6, depth)).toBe(6);
        }
        // Past either end of a zone, its end key.
        expect(on(1, -3, ORGAN.keys.front)).toBe(0);
        expect(on(1, 9, ORGAN.keys.front)).toBe(6);
    });

    it("outlines points by their convex hull", () => {
        const hull = convexHull([
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 5, y: 5 },
            { x: 10, y: 10 },
            { x: 0, y: 10 },
        ]);
        expect(hull).toHaveLength(4);
        expect(hull).not.toContainEqual({ x: 5, y: 5 });
    });
});
