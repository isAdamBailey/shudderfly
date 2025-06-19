import Dashboard from "@/Pages/Dashboard.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

describe("Dashboard.vue", () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(Dashboard);
  });

  describe("Component Rendering", () => {
    it("renders the dashboard page", () => {
      expect(wrapper.find(".authenticated-layout").exists()).toBe(true);
    });

    it("renders the dashboard header", () => {
      const header = wrapper.find("header h2");
      expect(header.exists()).toBe(true);
      expect(header.text()).toBe("Dashboard");
    });

    it("renders the main content area", () => {
      const mainContent = wrapper.find("main");
      expect(mainContent.exists()).toBe(true);
    });

    it("displays the logged in message", () => {
      const message = wrapper.find(".p-6");
      expect(message.exists()).toBe(true);
      expect(message.text()).toBe("You're logged in!");
    });
  });

  describe("Layout Structure", () => {
    it("has the correct CSS classes for responsive design", () => {
      const container = wrapper.find(".max-w-7xl");
      expect(container.exists()).toBe(true);
      expect(container.classes()).toContain("mx-auto");
      expect(container.classes()).toContain("sm:px-6");
      expect(container.classes()).toContain("lg:px-8");
    });

    it("has the correct card styling", () => {
      const card = wrapper.find(".bg-white");
      expect(card.exists()).toBe(true);
      expect(card.classes()).toContain("overflow-hidden");
      expect(card.classes()).toContain("shadow-sm");
      expect(card.classes()).toContain("sm:rounded-lg");
    });

    it("has proper spacing with py-12 class", () => {
      const spacingContainer = wrapper.find(".py-12");
      expect(spacingContainer.exists()).toBe(true);
    });
  });

  describe("Dark Mode Support", () => {
    it("includes dark mode classes", () => {
      const header = wrapper.find("header h2");
      expect(header.classes()).toContain("dark:text-gray-100");

      const card = wrapper.find(".bg-white");
      expect(card.classes()).toContain("dark:bg-gray-800");

      const content = wrapper.find(".text-gray-900");
      expect(content.classes()).toContain("dark:text-gray-100");
    });
  });

  describe("Accessibility", () => {
    it("has proper heading hierarchy", () => {
      const heading = wrapper.find("h2");
      expect(heading.exists()).toBe(true);
      expect(heading.attributes("class")).toContain("font-semibold");
    });

    it("has proper text sizing", () => {
      const heading = wrapper.find("h2");
      expect(heading.classes()).toContain("text-xl");
    });
  });

  describe("Component Integration", () => {
    it("uses AuthenticatedLayout component", () => {
      expect(
        wrapper.findComponent({ name: "AuthenticatedLayout" }).exists()
      ).toBe(true);
    });

    it("passes header slot to AuthenticatedLayout", () => {
      const headerSlot = wrapper.find("header");
      expect(headerSlot.exists()).toBe(true);
      expect(headerSlot.find("h2").text()).toBe("Dashboard");
    });

    it("passes default slot to AuthenticatedLayout", () => {
      const mainSlot = wrapper.find("main");
      expect(mainSlot.exists()).toBe(true);
      expect(mainSlot.text()).toContain("You're logged in!");
    });
  });
});
