import AnalogClock from "@/Components/WorldClock/AnalogClock.vue";
import { useGlobalTimer } from "@/composables/useGlobalTimer";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

const timer = useGlobalTimer();

describe("Components/WorldClock/AnalogClock.vue", () => {
  it("renders Roman numerals when numerals='roman'", () => {
    const wrapper = mount(AnalogClock, {
      props: { timezone: "UTC", numerals: "roman" }
    });
    const text = wrapper.text();
    expect(text).toContain("XII");
    expect(text).toContain("IV");
    expect(text).toContain("IX");
  });

  it("renders Arabic numerals when numerals='arabic'", () => {
    const wrapper = mount(AnalogClock, {
      props: { timezone: "UTC", numerals: "arabic" }
    });
    expect(wrapper.text()).toContain("12");
    expect(wrapper.text()).toContain("3");
  });

  it("renders no numerals when numerals='none'", () => {
    const wrapper = mount(AnalogClock, {
      props: { timezone: "UTC", numerals: "none" }
    });
    expect(wrapper.findAll("text").length).toBe(0);
  });

  it("applies rotation transforms to the hands", () => {
    const wrapper = mount(AnalogClock, {
      props: { timezone: "UTC" }
    });
    const rotated = wrapper
      .findAll("g")
      .filter((g) => (g.attributes("transform") || "").includes("rotate("));
    // hour, minute and second hands
    expect(rotated.length).toBe(3);
  });

  it("hides the second hand when showSeconds is false", () => {
    const wrapper = mount(AnalogClock, {
      props: { timezone: "UTC", showSeconds: false }
    });
    const rotated = wrapper
      .findAll("g")
      .filter((g) => (g.attributes("transform") || "").includes("rotate("));
    expect(rotated.length).toBe(2);
  });

  afterEach(() => timer.stop());

  it("renders no timer wedge when the global timer is inactive", () => {
    timer.stop();
    const wrapper = mount(AnalogClock, { props: { timezone: "UTC" } });
    expect(wrapper.findAll('[fill="#b91c1c"]').length).toBe(0);
  });

  it("renders a partial deep-red wedge (path) for a fractional timer", () => {
    timer.start(15 * 60);
    const wrapper = mount(AnalogClock, { props: { timezone: "UTC" } });
    const wedges = wrapper.findAll('[fill="#b91c1c"]');
    expect(wedges.length).toBe(1);
    expect(wedges[0].element.tagName.toLowerCase()).toBe("path");
  });

  it("renders a full deep-red disk (circle) when the timer fills the hour", () => {
    timer.start(60 * 60);
    const wrapper = mount(AnalogClock, { props: { timezone: "UTC" } });
    const wedges = wrapper.findAll('[fill="#b91c1c"]');
    expect(wedges.length).toBe(1);
    expect(wedges[0].element.tagName.toLowerCase()).toBe("circle");
  });

  it("gives each clock a unique gradient id", () => {
    const props = { timezone: "UTC", facePreset: "night" }; // 'night' has a gradient
    const id1 = mount(AnalogClock, { props }).find("radialGradient").attributes("id");
    const id2 = mount(AnalogClock, { props }).find("radialGradient").attributes("id");
    expect(id1).toBeTruthy();
    expect(id1).not.toBe(id2);
  });
});
