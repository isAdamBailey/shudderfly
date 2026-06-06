import ClockCard from "@/Components/WorldClock/ClockCard.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

describe("Components/WorldClock/ClockCard.vue", () => {
  let wrapper = null;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Unmount so the shared clock tick releases its subscriber and the next
    // mount re-reads the (faked) system time.
    if (wrapper) wrapper.unmount();
    wrapper = null;
    vi.useRealTimers();
  });

  const mountAt = async (isoInstant, timezone) => {
    vi.setSystemTime(new Date(isoInstant));
    wrapper = mount(ClockCard, {
      props: { city: { name: "Testville", timezone } }
    });
    // The clock tick fires in onMounted; flush so the DOM reflects it.
    await nextTick();
    return wrapper;
  };

  it("prints the time in 12-hour format with a period (PM)", async () => {
    await mountAt("2024-01-15T15:05:00Z", "UTC");
    expect(wrapper.text()).toContain("3:05 PM");
  });

  it("prints the time in 12-hour format (AM, midnight as 12)", async () => {
    await mountAt("2024-01-15T00:30:00Z", "UTC");
    expect(wrapper.text()).toContain("12:30 AM");
  });

  it("speaks the city and 12-hour time", async () => {
    await mountAt("2024-01-15T15:05:00Z", "UTC");
    await wrapper.find('[aria-label="Say the time in Testville"]').trigger("click");
    expect(wrapper.emitted("speak")?.[0]?.[0]).toBe("Testville, 3:05 PM");
  });
});
