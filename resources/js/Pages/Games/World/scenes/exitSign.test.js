import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { exitSignPose, exitSigns, leadsOut } from "./exitSign.js";
import { itemBox } from "./roomLayout.js";

const near = {
    id: "landing-door",
    type: "door",
    x: 130,
    z: 0,
    to: "library.floor-2",
    toSpot: "category-1",
    exit: true,
    open: true,
};
const far = {
    id: "far-door",
    type: "door",
    x: 1500,
    z: 0,
    to: "library.floor-2",
    toSpot: "category-1",
    open: true,
};
const kitchen = {
    id: "kitchen-door",
    type: "door",
    wall: "left",
    x: 0,
    z: 220,
    to: "house.kitchen",
    toSpot: "hall-door",
};
const stairs = {
    id: "downstairs",
    type: "door",
    wall: "left",
    x: 0,
    z: 220,
    to: "library.hall",
    toSpot: "upstairs",
    stairs: "down",
    exit: true,
};
const toy = { id: "lamp", type: "toy", x: 300, z: 0 };
const room = { interactables: [near, far, kitchen, toy] };

describe("leadsOut", () => {
    it("is the exit, and any door going the same way", () => {
        expect(leadsOut(room, near)).toBe(true);
        expect(leadsOut(room, far)).toBe(true);
    });

    it("isn't a door further in, stairs or anything else", () => {
        expect(leadsOut(room, kitchen)).toBe(false);
        expect(leadsOut({ interactables: [stairs] }, stairs)).toBe(false);
        expect(leadsOut(room, toy)).toBe(false);
    });
});

describe("exitSigns", () => {
    it("hangs one over each way out, above the doorway", () => {
        const { group, dispose } = exitSigns(THREE, room, "Salida");

        expect(group.children).toHaveLength(2);
        expect(group.children.map((sign) => sign.position.x)).toEqual([
            130 + 0,
            1500,
        ]);
        expect(exitSignPose(near).y).toBeGreaterThan(itemBox(near).height);
        dispose();
    });

    it("faces into the room off a side wall", () => {
        const side = { ...kitchen, exit: true };
        const { group } = exitSigns(THREE, { interactables: [side] }, "Exit");

        expect(group.children[0].rotation.y).toBeCloseTo(Math.PI / 2);
    });

    it("puts up nothing in a room with no way out but stairs", () => {
        expect(
            exitSigns(THREE, { interactables: [stairs] }, "Exit").group.children
        ).toHaveLength(0);
    });
});
