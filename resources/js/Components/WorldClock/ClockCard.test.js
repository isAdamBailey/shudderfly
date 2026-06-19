import ClockCard from "@/Components/WorldClock/ClockCard.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("@/composables/useTranslations", () => ({
  useTranslations: () => ({
    t: (key, replacements = {}) => {
      const translations = {
        "world_clock.clock_set_as_logo": ":city clock was put on top",
      };
      let translation = translations[key] || key;
      Object.keys(replacements).forEach((placeholder) => {
        translation = translation.replace(
          new RegExp(`:${placeholder}`, "g"),
          replacements[placeholder]
        );
      });
      return translation;
    },
  }),
}));

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

  const mountAt = async (isoInstant, timezone, extraProps = {}) => {
    vi.setSystemTime(new Date(isoInstant));
    wrapper = mount(ClockCard, {
      props: { city: { name: "Testville", timezone }, ...extraProps }
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

  it("falls back to the city name when no label is set", async () => {
    await mountAt("2024-01-15T15:05:00Z", "UTC");
    expect(wrapper.text()).toContain("Testville");
  });

  it("shows the custom label instead of the city name when provided", async () => {
    await mountAt("2024-01-15T15:05:00Z", "UTC", { label: "Grandma's House" });
    expect(wrapper.text()).toContain("Grandma's House");
    expect(wrapper.text()).not.toContain("Testville");
    await wrapper.find('[aria-label="Say the time in Grandma\'s House"]').trigger("click");
    expect(wrapper.emitted("speak")?.[0]?.[0]).toBe("Grandma's House, 3:05 PM");
  });

  it("announces the custom label when the logo pin is pressed", async () => {
    await mountAt("2024-01-15T15:05:00Z", "UTC", { label: "Grandma's House" });
    await wrapper
      .find('[aria-label="Use the Grandma\'s House clock as the app logo"]')
      .trigger("click");
    expect(wrapper.emitted("speak")?.[0]?.[0]).toBe(
      "Grandma's House clock was put on top"
    );
  });
});
