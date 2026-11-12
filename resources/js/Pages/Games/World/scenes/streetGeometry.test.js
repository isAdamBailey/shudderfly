import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BUTT_COLORS, GUSTER_COLORS } from "@/constants/characters.js";
import { serverList } from "../testing/serverList.js";
import { FACADE_SIZES } from "./roadLayout.js";
import { building, BUTT_HOUSE, DOORS, FACADES } from "./streetGeometry.js";

const LOOK = {
    walls: ["#ffffff"],
    roofs: ["#000000"],
    trim: "#cccccc",
    glass: "#99ccff",
    stone: {
        wall: "#888888",
        dark: "#333333",
        trim: "#aaaaaa",
        roof: "#222222",
        spire: "#111111",
        finial: "#ddaa22",
    },
    haunt: {
        wall: "#665544",
        dark: "#110f0e",
        trim: "#887766",
        roof: "#221f23",
        oak: "#4a2c17",
        oakDark: "#2e1a0d",
        brass: "#d4a73a",
        face: "#f5ecd7",
        glass: "#aaccbb",
    },
    pants: {
        denim: "#3355aa",
        dark: "#112233",
        stitch: "#ddaa33",
        cuff: "#5577cc",
        waistband: "#224488",
        label: "#885522",
        glass: "#cceeff",
        stripes: null,
        stars: null,
    },
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

/** The highest point of any of `parts`. */
function topOf(parts) {
    return Math.max(
        ...parts.map((part) => {
            part.computeBoundingBox();
            return part.boundingBox.max.y;
        })
    );
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

    it("draws every building shape the server's road may name", () => {
        expect(Object.keys(FACADES).sort()).toEqual(
            serverList("FACADES").sort()
        );
    });

    describe("a butt facade", () => {
        const box = {
            width: 300,
            height: 160,
            depth: 120,
            roof: 160 * FACADE_SIZES.butt.roof,
        };
        const butt = (door = "plain", look = LOOK) =>
            building(THREE, {
                ...box,
                look,
                palette: 0,
                door,
                facade: "butt",
            });
        const bounds = (part) => {
            part.computeBoundingBox();
            return part.boundingBox;
        };

        it("wears its look's pants, not the street's walls", () => {
            const { body } = butt();

            expect(painted(body, LOOK.pants.denim)).toBe(true);
            expect(painted(body, LOOK.pants.waistband)).toBe(true);
            expect(painted(body, LOOK.walls[0])).toBe(false);
            expect(painted(body, LOOK.roofs[0])).toBe(false);
        });

        it("roofs it with the Butt's cheeks over the waistband, the crack between", () => {
            const parts = butt().body;
            const cheeks = parts.filter((p) => painted([p], BUTT_COLORS.near));
            const crack = parts.find((p) => painted([p], BUTT_COLORS.cleft));

            expect(cheeks).toHaveLength(2);
            const [left, right] = cheeks
                .map(bounds)
                .sort((a, b) => a.min.x - b.min.x);
            expect(left.max.x).toBeLessThan(right.max.x);
            expect((left.min.x + left.max.x) / 2).toBeLessThan(0);
            expect((right.min.x + right.max.x) / 2).toBeGreaterThan(0);
            // Spilling just over the waistband, no lower.
            for (const cheek of [left, right]) {
                expect(cheek.min.y).toBeLessThan(box.height);
                expect(cheek.min.y).toBeGreaterThan(
                    box.height * (1 - BUTT_HOUSE.waistband)
                );
            }
            const c = bounds(crack);
            expect(Math.abs(c.min.x + c.max.x)).toBeLessThan(1e-6);
            expect(c.min.y).toBeGreaterThanOrEqual(box.height - 1e-6);
        });

        it("keeps the cheeks within the box's roof, well over the eaves", () => {
            const { body } = butt();

            expect(topOf(body)).toBeGreaterThan(box.height + box.roof * 0.9);
            expect(topOf(body)).toBeLessThanOrEqual(box.height + box.roof);
        });

        it("stands on two legs, the door between them only with one", () => {
            const { body } = butt();
            const cuffs = body
                .filter((p) => painted([p], LOOK.pants.cuff))
                .map(bounds)
                .filter((b) => b.max.y < box.height * 0.1);
            const gap = (box.width * BUTT_HOUSE.crotch) / 2;

            const middles = cuffs.map((b) => (b.min.x + b.max.x) / 2);
            expect(middles.some((x) => x < -gap)).toBe(true);
            expect(middles.some((x) => x > gap)).toBe(true);
            const doorParts = body
                .filter((p) => painted([p], DOORS.plain.wood))
                .map(bounds);
            expect(doorParts).toHaveLength(1);
            expect(doorParts[0].min.x).toBeGreaterThan(-gap);
            expect(doorParts[0].max.x).toBeLessThan(gap);
            expect(painted(butt(null).body, DOORS.plain.wood)).toBe(false);
        });

        it("glows its back pockets, either side of the seat", () => {
            const { windows } = butt();
            const pockets = windows.map(bounds);

            expect(pockets).toHaveLength(2);
            expect(painted(windows, LOOK.pants.glass)).toBe(true);
            expect(pockets.some((b) => b.max.x < 0)).toBe(true);
            expect(pockets.some((b) => b.min.x > 0)).toBe(true);
            for (const b of pockets) {
                expect(b.min.y).toBeGreaterThan(box.height * BUTT_HOUSE.legs);
                expect(b.max.y).toBeLessThan(
                    box.height * (1 - BUTT_HOUSE.waistband)
                );
            }
        });

        it("hangs its sign on the waistband's label, under the crack", () => {
            const sign = FACADES.butt.sign(box);

            expect(sign.y).toBeGreaterThan(box.height * 0.8);
            expect(sign.y + sign.size).toBeLessThan(box.height);
        });

        it("only stripes and stars the pants where the season does", () => {
            const plain = butt();
            const july = butt("plain", {
                ...LOOK,
                pants: { ...LOOK.pants, stripes: "#ff0000", stars: "#ffffff" },
            });

            expect(painted(plain.body, "#ff0000")).toBe(false);
            expect(painted(july.body, "#ff0000")).toBe(true);
            expect(painted(july.body, "#ffffff")).toBe(true);
            // Stripes round each leg, never across the door.
            const gap = (box.width * BUTT_HOUSE.crotch) / 2;
            for (const b of july.body
                .filter((p) => painted([p], "#ff0000"))
                .map(bounds)
                .filter((b) => b.min.y < box.height * BUTT_HOUSE.legs)) {
                expect(b.min.x > gap - 1 || b.max.x < -gap + 1).toBe(true);
            }
        });
    });

    describe("a gothic facade", () => {
        const box = {
            width: 360,
            height: 200,
            depth: 140,
            roof: 200 * FACADE_SIZES.gothic.roof,
        };
        const gothic = (door = "plain") =>
            building(THREE, {
                ...box,
                look: LOOK,
                palette: 0,
                door,
                facade: "gothic",
            });

        it("is built of its look's stone, not the street's walls", () => {
            const { body } = gothic();

            expect(painted(body, LOOK.stone.wall)).toBe(true);
            expect(painted(body, LOOK.stone.spire)).toBe(true);
            expect(painted(body, LOOK.walls[0])).toBe(false);
        });

        it("raises its spires within the box's roof", () => {
            const { body } = gothic();

            expect(topOf(body)).toBeGreaterThan(box.height * 1.5);
            expect(topOf(body)).toBeLessThanOrEqual(box.height + box.roof);
        });

        it("has glass to light at night, and its door only with one", () => {
            expect(gothic().windows.length).toBeGreaterThan(4);
            expect(painted(gothic().body, DOORS.plain.wood)).toBe(true);
            expect(painted(gothic(null).body, DOORS.plain.wood)).toBe(false);
        });

        it("hangs its sign in the rose window, under the eaves", () => {
            const sign = FACADES.gothic.sign(box);

            expect(sign.y).toBeGreaterThan(box.height * 0.5);
            expect(sign.y + sign.size).toBeLessThan(box.height);
        });
    });

    describe("a haunted facade", () => {
        const box = {
            width: 320,
            height: 200,
            depth: 140,
            roof: 200 * FACADE_SIZES.haunted.roof,
        };
        const haunted = (door = "plain") =>
            building(THREE, {
                ...box,
                look: LOOK,
                palette: 0,
                door,
                facade: "haunted",
            });

        it("has a clock tower in the grandfather clock's oak, brass and cream", () => {
            const { body } = haunted();

            for (const color of ["oak", "oakDark", "brass", "face"]) {
                expect(painted(body, LOOK.haunt[color])).toBe(true);
            }
            expect(painted(body, LOOK.walls[0])).toBe(false);
        });

        it("raises its tower within the box's roof, well past the eaves", () => {
            const { body } = haunted();

            expect(topOf(body)).toBeGreaterThan(box.height * 2);
            expect(topOf(body)).toBeLessThanOrEqual(box.height + box.roof);
        });

        it("hangs a bell in its belfry, between the clock and the spire", () => {
            const brassBetween = haunted().body.filter((part) => {
                part.computeBoundingBox();
                const { min, max } = part.boundingBox;
                return (
                    painted([part], LOOK.haunt.brass) &&
                    min.y > box.height * 1.26 &&
                    max.y < box.height * 1.58
                );
            });

            expect(brassBetween).toHaveLength(1);
        });

        it("roofs each wing over itself, not behind the tower", () => {
            const roofs = haunted().body.filter(
                (part) =>
                    painted([part], LOOK.haunt.roof) &&
                    (part.computeBoundingBox(), true) &&
                    part.boundingBox.max.y < box.height * 1.7 &&
                    part.boundingBox.max.x - part.boundingBox.min.x >
                        box.width * 0.3
            );
            const centres = roofs.map(
                ({ boundingBox: b }) => (b.min.x + b.max.x) / 2
            );

            expect(centres.some((x) => x < -box.width * 0.2)).toBe(true);
            expect(centres.some((x) => x > box.width * 0.2)).toBe(true);
        });

        it("hangs its bell in front of the belfry's dark back wall", () => {
            const parts = haunted().body.map((part) => {
                part.computeBoundingBox();
                return part;
            });
            const inBelfry = ({ boundingBox: b }) =>
                b.min.y > box.height * 1.25 && b.max.y < box.height * 1.59;
            const bell = parts.find(
                (p) => inBelfry(p) && painted([p], LOOK.haunt.brass)
            );
            // The widest dark thing up there (the clapper is dark too).
            const back = parts
                .filter((p) => inBelfry(p) && painted([p], LOOK.haunt.dark))
                .sort(
                    (a, b) =>
                        b.boundingBox.max.x -
                        b.boundingBox.min.x -
                        (a.boundingBox.max.x - a.boundingBox.min.x)
                )[0];

            expect(bell.boundingBox.min.z).toBeGreaterThan(
                back.boundingBox.max.z
            );
        });

        it("glows its windows in its own glass, and has a door only with one", () => {
            expect(haunted().windows.length).toBeGreaterThan(8);
            expect(painted(haunted().windows, LOOK.haunt.glass)).toBe(true);
            expect(painted(haunted().body, DOORS.plain.wood)).toBe(true);
            expect(painted(haunted(null).body, DOORS.plain.wood)).toBe(false);
        });

        it("hangs its sign over the door, in front of the tower", () => {
            const sign = FACADES.haunted.sign(box);

            expect(sign.y).toBeGreaterThan(box.height * 0.34);
            expect(sign.y + sign.size).toBeLessThan(box.height * 0.56);
            expect(sign.z).toBeGreaterThan(8);
        });
    });

    describe("Christmas bulbs on a shaped front", () => {
        const lit = { ...LOOK, bulbs: ["#ff0000", "#00ff00"] };
        const centre = (part) => {
            part.computeBoundingBox();
            const { min, max } = part.boundingBox;
            return { x: (min.x + max.x) / 2, z: (min.z + max.z) / 2 };
        };

        it("hang a gothic front's against its nave and towers, not in the air", () => {
            const width = 360;
            const { bulbs } = building(THREE, {
                width,
                height: 200,
                depth: 140,
                roof: 172,
                look: lit,
                palette: 0,
                facade: "gothic",
            });
            const spots = bulbs.map(centre);
            const nave = spots.filter((b) => Math.abs(b.x) < width / 4);
            const towers = spots.filter((b) => Math.abs(b.x) > width / 4);

            expect(nave.length).toBeGreaterThan(0);
            expect(towers.length).toBeGreaterThan(0);
            for (const b of nave) expect(b.z).toBeLessThan(10);
            for (const b of towers) expect(b.z).toBeGreaterThan(6);
        });

        it("hang along a butt front's waistband, clear of its loops and label", () => {
            const width = 300;
            const height = 160;
            const { bulbs } = building(THREE, {
                width,
                height,
                depth: 120,
                roof: 80,
                look: lit,
                palette: 0,
                facade: "butt",
            });
            const label = FACADES.butt.sign({ width, height });

            expect(bulbs.length).toBeGreaterThan(4);
            for (const b of bulbs.map(centre)) {
                expect(Math.abs(b.x)).toBeGreaterThan(label.size / 2);
                for (const at of BUTT_HOUSE.loops) {
                    expect(
                        Math.abs(Math.abs(b.x) - at * width)
                    ).toBeGreaterThan(width * 0.015);
                }
            }
        });

        it("leave a haunted front's clock tower clear, even kept short", () => {
            const width = 210;
            const { bulbs } = building(THREE, {
                width,
                height: 89,
                depth: 140,
                roof: 100,
                look: lit,
                palette: 0,
                facade: "haunted",
            });

            expect(bulbs.length).toBeGreaterThan(0);
            for (const b of bulbs.map(centre)) {
                expect(Math.abs(b.x)).toBeGreaterThan((width * 0.3) / 2);
            }
        });
    });
});
