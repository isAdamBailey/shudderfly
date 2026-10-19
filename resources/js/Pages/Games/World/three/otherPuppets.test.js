import { describe, expect, it, vi } from "vitest";
import { createOtherPuppets } from "./otherPuppets.js";

// A kit whose butts only record what they're told.
function fakeKit() {
    const made = [];
    return {
        made,
        castMesh: vi.fn((id, options) => {
            const position = {
                x: 0,
                z: 0,
                set(x, y, z) {
                    Object.assign(this, { x, z });
                },
            };
            const puppet = {
                id,
                options,
                group: { position },
                set: vi.fn(),
                setMove: vi.fn(),
                setReducedMotion: vi.fn(),
                tick: vi.fn(() => false),
                dispose: vi.fn(),
            };
            made.push(puppet);
            return puppet;
        }),
    };
}

const someone = (id, more) => ({
    id,
    x: 100,
    z: 200,
    facing: 1,
    walking: false,
    lift: 0,
    ...more,
});

describe("createOtherPuppets", () => {
    it("makes a butt for someone new, at the size given, where they stand", () => {
        const kit = fakeKit();
        const scene = { add: vi.fn() };
        const others = createOtherPuppets(kit, scene);
        others.setSize(120);
        others.setReducedMotion(true);

        expect(others.sync([someone(2)], (o) => o, 0.016)).toBe(true);

        const [butt] = kit.made;
        expect(kit.castMesh).toHaveBeenCalledWith("butt", { size: 120 });
        expect(butt.setReducedMotion).toHaveBeenCalledWith(true);
        expect(scene.add).toHaveBeenCalledWith(butt.group);
        expect(butt.group.position).toMatchObject({ x: 100, z: 200 });
        expect(butt.setMove).toHaveBeenLastCalledWith(null);
    });

    it("walks them, and reports nothing when nothing changed", () => {
        const kit = fakeKit();
        const others = createOtherPuppets(kit, { add() {} });
        others.sync([someone(2)], (o) => o, 0.016);

        expect(others.sync([someone(2)], (o) => o, 0.016)).toBe(false);

        const walking = someone(2, { x: 140, facing: -1, walking: true });
        expect(others.sync([walking], (o) => o, 0.016)).toBe(true);
        const [butt] = kit.made;
        expect(butt.setMove).toHaveBeenLastCalledWith("walk");
        expect(butt.set).toHaveBeenLastCalledWith({ lift: 0, facing: "left" });
    });

    it("drops someone who's gone, and everyone on dispose", () => {
        const kit = fakeKit();
        const others = createOtherPuppets(kit, { add() {} });
        others.sync([someone(2), someone(3)], (o) => o, 0.016);
        const [two, three] = kit.made;

        expect(others.sync([someone(3)], (o) => o, 0.016)).toBe(true);
        expect(two.dispose).toHaveBeenCalled();

        others.dispose();
        expect(three.dispose).toHaveBeenCalled();
    });
});
