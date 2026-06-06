import { getZonedParts } from "@/composables/useClockTime";
import { describe, expect, it } from "vitest";

describe("composables/useClockTime getZonedParts", () => {
  // 2024-01-15T15:30:45Z — a winter date so US zones are in standard time.
  const instant = new Date("2024-01-15T15:30:45.000Z");

  it("returns correct parts for UTC", () => {
    const parts = getZonedParts("UTC", instant);
    expect(parts.hour24).toBe(15);
    expect(parts.minutes).toBe(30);
    expect(parts.seconds).toBe(45);
    // (15 % 12) + 30/60 + 45/3600
    expect(parts.hours).toBeCloseTo(3.5125, 4);
  });

  it("applies the timezone offset (America/New_York, EST = UTC-5)", () => {
    const parts = getZonedParts("America/New_York", instant);
    expect(parts.hour24).toBe(10);
    expect(parts.minutes).toBe(30);
    expect(parts.seconds).toBe(45);
    expect(parts.hours).toBeCloseTo(10.5125, 4);
  });

  it("applies a positive offset (Asia/Tokyo = UTC+9)", () => {
    const parts = getZonedParts("Asia/Tokyo", instant);
    // 15:30 UTC + 9h = 00:30 next day
    expect(parts.hour24).toBe(0);
    expect(parts.minutes).toBe(30);
  });
});
