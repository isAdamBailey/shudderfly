import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock usePage before importing the component
vi.mock("@inertiajs/vue3", () => ({
  usePage: vi.fn()
}));

// Import the actual ApplicationLogo component to test theme-dependent SVG switching
import ApplicationLogo from "@/Components/ApplicationLogo.vue";
import { usePage } from "@inertiajs/vue3";

describe("ApplicationLogo", () => {
  let wrapper;

  beforeEach(() => {
    // Reset any previous wrapper
    wrapper = null;
  });

  describe("Theme Switching", () => {
    describe("Default Theme (No Theme)", () => {
      it("shows fly SVG when no theme is set", () => {
        usePage.mockReturnValue({
          props: {
            theme: ""
          }
        });

        wrapper = mount(ApplicationLogo);

        // Should show the fly SVG
        expect(wrapper.find("#fly").exists()).toBe(true);
        expect(wrapper.find("#snowman").exists()).toBe(false);
        expect(wrapper.find("#firework").exists()).toBe(false);
      });

      it("shows fly SVG when theme is null", () => {
        usePage.mockReturnValue({
          props: {
            theme: null
          }
        });

        wrapper = mount(ApplicationLogo);

        // Should show the fly SVG
        expect(wrapper.find("#fly").exists()).toBe(true);
        expect(wrapper.find("#snowman").exists()).toBe(false);
        expect(wrapper.find("#firework").exists()).toBe(false);
      });

      it("shows fly SVG when theme is undefined", () => {
        usePage.mockReturnValue({
          props: {
            theme: undefined
          }
        });

        wrapper = mount(ApplicationLogo);

        // Should show the fly SVG
        expect(wrapper.find("#fly").exists()).toBe(true);
        expect(wrapper.find("#snowman").exists()).toBe(false);
        expect(wrapper.find("#firework").exists()).toBe(false);
      });
    });

    describe("Christmas Theme", () => {
      it("shows snowman SVG when theme is christmas", () => {
        usePage.mockReturnValue({
          props: {
            theme: "christmas"
          }
        });

        wrapper = mount(ApplicationLogo);

        // Should show the snowman SVG
        expect(wrapper.find("#snowman").exists()).toBe(true);
        expect(wrapper.find("#fly").exists()).toBe(false);
        expect(wrapper.find("#firework").exists()).toBe(false);
      });

      it("includes snowman-specific elements", () => {
        usePage.mockReturnValue({
          props: {
            theme: "christmas"
          }
        });

        wrapper = mount(ApplicationLogo);

        const snowman = wrapper.find("#snowman");

        // Check for snowman-specific elements
        expect(snowman.find("circle[fill='white']").exists()).toBe(true);
        expect(snowman.find("rect[fill='black']").exists()).toBe(true); // Hat
        expect(snowman.find("path[stroke='red']").exists()).toBe(true); // Scarf
        expect(snowman.find("path[stroke='brown']").exists()).toBe(true); // Arms
      });
    });

    describe("Fireworks Theme", () => {
      it("shows firework SVG when theme is fireworks", () => {
        usePage.mockReturnValue({
          props: {
            theme: "fireworks"
          }
        });

        wrapper = mount(ApplicationLogo);

        // Should show the firework SVG
        expect(wrapper.find("#firework").exists()).toBe(true);
        expect(wrapper.find("#fly").exists()).toBe(false);
        expect(wrapper.find("#snowman").exists()).toBe(false);
      });

      it("includes firework-specific elements", () => {
        usePage.mockReturnValue({
          props: {
            theme: "fireworks"
          }
        });

        wrapper = mount(ApplicationLogo);

        const firework = wrapper.find("#firework");

        // Check for firework-specific elements
        expect(firework.find("rect[fill='#333']").exists()).toBe(true); // Rocket body
        expect(firework.find("path[fill='red']").exists()).toBe(true); // Nose cone and fins
        expect(firework.find("#sparks").exists()).toBe(true);
        expect(firework.find("circle[fill='yellow']").exists()).toBe(true);
        expect(firework.find("circle[fill='orange']").exists()).toBe(true);
        expect(firework.find("circle[fill='red']").exists()).toBe(true);
      });
    });
  });

  describe("Theme Logic", () => {
    it("correctly switches between all three themes", () => {
      const themes = [
        { theme: "", expectedId: "fly" },
        { theme: "christmas", expectedId: "snowman" },
        { theme: "fireworks", expectedId: "firework" }
      ];

      themes.forEach(({ theme, expectedId }) => {
        usePage.mockReturnValue({
          props: {
            theme: theme
          }
        });

        const testWrapper = mount(ApplicationLogo);

        // Should show the expected SVG
        expect(testWrapper.find(`#${expectedId}`).exists()).toBe(true);

        // Should not show the other SVGs
        const otherIds = themes
          .filter((t) => t.expectedId !== expectedId)
          .map((t) => t.expectedId);
        otherIds.forEach((id) => {
          expect(testWrapper.find(`#${id}`).exists()).toBe(false);
        });
      });
    });

    it("ensures only one SVG is shown at a time", () => {
      const themes = ["", "christmas", "fireworks"];

      themes.forEach((theme) => {
        usePage.mockReturnValue({
          props: {
            theme: theme
          }
        });

        const testWrapper = mount(ApplicationLogo);

        // Count how many theme SVGs are present
        const flyCount = testWrapper.findAll("#fly").length;
        const snowmanCount = testWrapper.findAll("#snowman").length;
        const fireworkCount = testWrapper.findAll("#firework").length;

        // Only one should be present
        expect(flyCount + snowmanCount + fireworkCount).toBe(1);
      });
    });
  });

  describe("Computed Properties", () => {
    it("correctly computes isChristmas based on theme", () => {
      // Test christmas theme
      usePage.mockReturnValue({
        props: {
          theme: "christmas"
        }
      });

      let wrapper = mount(ApplicationLogo);

      expect(wrapper.vm.isChristmas).toBe(true);
      expect(wrapper.vm.isJuly).toBe(false);

      // Test non-christmas theme
      usePage.mockReturnValue({
        props: {
          theme: "fireworks"
        }
      });

      wrapper = mount(ApplicationLogo);

      expect(wrapper.vm.isChristmas).toBe(false);
      expect(wrapper.vm.isJuly).toBe(true);
    });

    it("correctly computes isJuly based on theme", () => {
      // Test fireworks theme
      usePage.mockReturnValue({
        props: {
          theme: "fireworks"
        }
      });

      let wrapper = mount(ApplicationLogo);

      expect(wrapper.vm.isJuly).toBe(true);
      expect(wrapper.vm.isChristmas).toBe(false);

      // Test non-fireworks theme
      usePage.mockReturnValue({
        props: {
          theme: "christmas"
        }
      });

      wrapper = mount(ApplicationLogo);

      expect(wrapper.vm.isJuly).toBe(false);
      expect(wrapper.vm.isChristmas).toBe(true);
    });
  });

  describe("SVG Structure", () => {
    it("maintains consistent outer structure across all themes", () => {
      const themes = ["", "christmas", "fireworks"];

      themes.forEach((theme) => {
        usePage.mockReturnValue({
          props: {
            theme: theme
          }
        });

        const testWrapper = mount(ApplicationLogo);

        // All themes should have the same outer SVG structure
        const svg = testWrapper.find("svg");
        expect(svg.exists()).toBe(true);
        expect(svg.attributes("width")).toBe("100%");
        expect(svg.attributes("height")).toBe("100%");
        expect(svg.attributes("viewBox")).toBe("0 0 200 200");
        expect(svg.attributes("xmlns")).toBe("http://www.w3.org/2000/svg");

        // All themes should have the outer circle and dots
        expect(svg.find("circle[stroke='black']").exists()).toBe(true);
        expect(svg.findAll("circle[fill='white']").length).toBeGreaterThan(0);
      });
    });

    it("ensures theme-specific elements have unique IDs", () => {
      usePage.mockReturnValue({
        props: {
          theme: "christmas"
        }
      });

      const wrapper = mount(ApplicationLogo);

      // Check that IDs are unique
      const allElements = wrapper.findAll("[id]");
      const ids = allElements.map((el) => el.attributes("id"));
      const uniqueIds = [...new Set(ids)];

      expect(ids.length).toBe(uniqueIds.length);
    });
  });
});
