import { useLogoPreference } from "@/composables/useLogoPreference";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";

const STORAGE_KEY = "shudderfly.worldClock.logo";

describe("composables/useLogoPreference", () => {
  beforeEach(() => {
    const { clearLogoClock } = useLogoPreference();
    clearLogoClock();
    localStorage.clear();
  });

  it("starts disabled by default", () => {
    const { logo } = useLogoPreference();
    expect(logo.enabled).toBe(false);
  });

  it("setLogoClock enables and stores the chosen clock", async () => {
    const { logo, setLogoClock } = useLogoPreference();
    setLogoClock({
      cityName: "Tokyo",
      timezone: "Asia/Tokyo",
      facePreset: "night",
      handPreset: "ornate",
      numerals: "roman"
    });

    expect(logo.enabled).toBe(true);
    expect(logo.timezone).toBe("Asia/Tokyo");
    expect(logo.cityName).toBe("Tokyo");

    await nextTick();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.enabled).toBe(true);
    expect(stored.timezone).toBe("Asia/Tokyo");
    expect(stored.facePreset).toBe("night");
  });

  it("clearLogoClock resets to the default logo", async () => {
    const { logo, setLogoClock, clearLogoClock } = useLogoPreference();
    setLogoClock({ cityName: "Paris", timezone: "Europe/Paris" });
    expect(logo.enabled).toBe(true);

    clearLogoClock();
    expect(logo.enabled).toBe(false);
    expect(logo.timezone).toBe("");

    await nextTick();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.enabled).toBe(false);
  });
});
