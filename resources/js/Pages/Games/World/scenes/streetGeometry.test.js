import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { GUSTER_COLORS } from "@/constants/characters.js";
import { serverList } from "../testing/serverList.js";
import { FACADE_SIZES } from "./roadLayout.js";
import { building, DOORS, FACADES } from "./streetGeometry.js";

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
