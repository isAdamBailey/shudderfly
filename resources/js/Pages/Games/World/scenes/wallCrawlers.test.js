import { describe, expect, it } from "vitest";
import { crawlerAt, WALL_CRAWLERS } from "./wallCrawlers.js";

const wall = { w: 1000, h: 500 };

describe("wall crawlers", () => {
    it("spreads them down the wall, some heading back", () => {
        const spots = WALL_CRAWLERS.map((c) =>
            crawlerAt(c, wall.w, wall.h, 0)
        );

        expect(new Set(spots.map((s) => Math.round(s.x))).size).toBe(
            WALL_CRAWLERS.length
        );
        expect(spots[0].y).toBeGreaterThan(spots.at(-2).y);
        expect(WALL_CRAWLERS.filter((c) => c.reverse).length).toBeGreaterThan(
            0
        );
    });

    it("walks across the wall, and much more slowly when motion is reduced", () => {
        const c = WALL_CRAWLERS[0];
        const start = crawlerAt(c, wall.w, wall.h, 0).x;
        const later = crawlerAt(c, wall.w, wall.h, 1).x;
        const calm = crawlerAt(c, wall.w, wall.h, 1, true).x;

        expect(later).toBeGreaterThan(start);
        expect(calm - start).toBeLessThan(later - start);
        expect(crawlerAt(c, wall.w, wall.h, c.duration).x).toBeCloseTo(start);
    });
});
