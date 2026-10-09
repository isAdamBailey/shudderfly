import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { CAST } from "@/constants/characters.js";
import { buttShapes } from "./buttDraw.js";
import CastMember from "./CastMember.vue";

describe("CastMember", () => {
    it("draws every character, decorative by default", () => {
        for (const [id, member] of Object.entries(CAST)) {
            const wrapper = mount(CastMember, { props: { id } });
            const root = wrapper.get(".cast-member");

            expect(root.attributes("aria-hidden")).toBe("true");
            expect(root.classes()).toContain(`cast-${id}`);
            if (id === "butt") {
                const cheeks = buttShapes().filter(
                    (shape) => shape.type === "cheek"
                );
                const legs = buttShapes().filter(
                    (shape) => shape.type === "leg"
                );
                expect(wrapper.find(".cast-glyph").exists()).toBe(false);
                const feet = buttShapes().filter(
                    (shape) => shape.type === "foot"
                );
                const drawnCheeks = wrapper.findAll(".butt-cheek");
                const drawnLegs = wrapper.findAll(".butt-leg");
                const drawnFeet = wrapper.findAll(".butt-foot");
                expect(drawnCheeks).toHaveLength(cheeks.length);
                expect(drawnLegs).toHaveLength(legs.length);
                expect(drawnFeet).toHaveLength(feet.length);
                drawnFeet.forEach((foot, index) => {
                    expect(Number(foot.attributes("rx"))).toBeGreaterThan(
                        Number(foot.attributes("ry"))
                    );
                    expect(Number(foot.attributes("cx"))).toBeCloseTo(
                        feet[index].x
                    );
                });
                drawnCheeks.forEach((cheek, index) => {
                    expect(Number(cheek.attributes("cx"))).toBeCloseTo(
                        cheeks[index].x
                    );
                    expect(Number(cheek.attributes("r"))).toBeCloseTo(
                        cheeks[index].r
                    );
                });
                drawnLegs.forEach((leg, index) => {
                    expect(Number(leg.attributes("y2"))).toBeCloseTo(
                        legs[index].y2
                    );
                });
            } else if (member.emoji) {
                expect(wrapper.get(".cast-glyph").text()).toBe(member.emoji);
            } else {
                expect(wrapper.find(".person").exists()).toBe(true);
            }
        }
    });

    it("can do every move it lists", () => {
        for (const [id, member] of Object.entries(CAST)) {
            for (const move of member.moves) {
                const wrapper = mount(CastMember, { props: { id, move } });
                expect(wrapper.classes()).toContain(`cast-move-${move}`);
            }
        }
    });

    it("ignores a move the character doesn't have", () => {
        const wrapper = mount(CastMember, {
            props: { id: "toilet", move: "hop" },
        });

        expect(wrapper.classes().some((c) => c.startsWith("cast-move-"))).toBe(
            false
        );
    });

    it("is an image when labelled", () => {
        const wrapper = mount(CastMember, {
            props: { id: "butt", label: "The Butt" },
        });

        expect(wrapper.attributes("role")).toBe("img");
        expect(wrapper.attributes("aria-label")).toBe("The Butt");
        expect(wrapper.attributes("aria-hidden")).toBeUndefined();
    });

    it("can be named after the character", () => {
        const wrapper = mount(CastMember, {
            props: { id: "toilet", label: true },
        });

        expect(wrapper.attributes("aria-label")).toBe("games.cast.toilet");
    });

    it("mirrors when facing left", () => {
        const wrapper = mount(CastMember, {
            props: { id: "butt", facing: "left" },
        });

        expect(wrapper.classes()).toContain("cast-facing-left");
    });

    it("lifts the body and shrinks its shadow, which stays on the ground", () => {
        const wrapper = mount(CastMember, { props: { id: "butt", lift: 120 } });

        expect(wrapper.get(".cast-lift").attributes("style")).toContain(
            "translateY(-120px)"
        );
        expect(wrapper.get(".cast-ground").attributes("style")).toContain(
            "scale(0.5)"
        );
    });

    it("squashes on landing from a throw, but not from a walking bob", async () => {
        const wrapper = mount(CastMember, { props: { id: "apple", lift: 6 } });
        await wrapper.setProps({ lift: 0 });
        expect(wrapper.classes()).not.toContain("cast-landing");

        await wrapper.setProps({ lift: 80 });
        await wrapper.setProps({ lift: 0 });
        await nextTick();
        expect(wrapper.classes()).toContain("cast-landing");
    });

    it("plays a one-shot over the ongoing move until it ends", async () => {
        const wrapper = mount(CastMember, { props: { id: "butt" } });

        wrapper.vm.play("toot");
        await nextTick();
        expect(wrapper.classes()).toContain("cast-move-toot");

        await wrapper.get(".cast-body").trigger("animationend");
        expect(wrapper.classes()).toContain("cast-move-idle");
    });

    it("ignores a one-shot the character doesn't have", async () => {
        const wrapper = mount(CastMember, { props: { id: "toilet" } });

        wrapper.vm.play("toot");
        await nextTick();

        expect(wrapper.classes()).toContain("cast-move-idle");
    });

    it("chomps with the face's own gulp", () => {
        const wrapper = mount(CastMember, {
            props: { id: "face", move: "chomp" },
        });

        expect(wrapper.get(".person").classes()).toContain("gulping");
    });
});
