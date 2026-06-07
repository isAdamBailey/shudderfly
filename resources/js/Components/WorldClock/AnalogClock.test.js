import AnalogClock from "@/Components/WorldClock/AnalogClock.vue";
import { useWorldClockSync } from "@/composables/useWorldClockSync";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";

const sync = useWorldClockSync();

// Set (or clear) the shared timer end time the way the server would, then let
// the countdown watcher react.
const setTimer = async (secondsFromNow) => {
  const now = new Date();
  sync.applyRemote({
    timer_ends_at:
      secondsFromNow == null
        ? null
        : new Date(now.getTime() + secondsFromNow * 1000).toISOString(),
    server_now: now.toISOString()
  });
  await nextTick();
  await nextTick();
};

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

  beforeEach(() => {
    window.Echo = {
      socketId: () => "socket-123",
      private: () => ({ listen: () => {} })
    };
  });

  afterEach(() => setTimer(null));

  it("renders no timer wedge when the global timer is inactive", async () => {
    await setTimer(null);
    const wrapper = mount(AnalogClock, { props: { timezone: "UTC" } });
    expect(wrapper.findAll('[fill="#b91c1c"]').length).toBe(0);
  });

  it("renders a partial deep-red wedge (path) for a fractional timer", async () => {
    await setTimer(15 * 60);
    const wrapper = mount(AnalogClock, { props: { timezone: "UTC" } });
    const wedges = wrapper.findAll('[fill="#b91c1c"]');
    expect(wedges.length).toBe(1);
    expect(wedges[0].element.tagName.toLowerCase()).toBe("path");
  });

  it("renders a full deep-red disk (circle) when the timer fills the hour", async () => {
    await setTimer(60 * 60 + 10);
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
