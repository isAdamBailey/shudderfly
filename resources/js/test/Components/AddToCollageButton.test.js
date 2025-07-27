import AddToCollageButton from "@/Components/AddToCollageButton.vue";
import { useForm } from "@inertiajs/vue3";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

global.route = (name) => `/${name}`;

// Mock the constants
vi.mock("@/constants/collage", () => ({
  MAX_COLLAGE_PAGES: 10
}));

// Mock the speech synthesis composable
vi.mock("@/composables/useSpeechSynthesis", () => ({
  useSpeechSynthesis: () => ({
    speak: vi.fn(),
    speaking: false
  })
}));

describe("AddToCollageButton", () => {
  let wrapper;
  let mockForm;

  const createMockForm = () => ({
    data: { collage_id: null, page_id: 1 },
    errors: {},
    processing: false,
    post: vi.fn(),
    reset: vi.fn()
  });

  const createCollages = (overrides = []) => {
    const defaultCollages = [
      { id: 1, pages: [], is_archived: false },
      { id: 2, pages: [], is_archived: false },
      { id: 3, pages: [], is_archived: false }
    ];

    return defaultCollages.map((collage, index) => ({
      ...collage,
      ...(overrides[index] || {})
    }));
  };

  beforeEach(() => {
    mockForm = createMockForm();
    useForm.mockReturnValue(mockForm);
  });

  describe("Page already in collage", () => {
    it("shows message when page is in one collage", () => {
      const collages = createCollages([
        { id: 1, pages: [{ id: 1 }], is_archived: false }
      ]);

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      expect(wrapper.text()).toContain("This picture is in collage");
      expect(wrapper.text()).toContain("#1");
      expect(wrapper.find("select").exists()).toBe(false);
    });

    it("shows message when page is in multiple collages", () => {
      const collages = createCollages([
        { id: 1, pages: [{ id: 1 }], is_archived: false },
        { id: 2, pages: [{ id: 1 }], is_archived: false }
      ]);

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      expect(wrapper.text()).toContain("This picture is in collage");
      expect(wrapper.text()).toContain("#1");
      expect(wrapper.text()).toContain("#2");
      const normalized = wrapper.text().replace(/\s+/g, "");
      expect(normalized).toContain("#1,#2");
    });

    it("does not show message when page is only in archived collages", () => {
      const collages = [
        {
          id: 1,
          pages: [{ id: 1 }],
          is_archived: true
        }
      ];

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      expect(wrapper.text()).not.toMatch(/This picture is in collage/);
      expect(wrapper.find("select").exists()).toBe(true);
    });
  });

  describe("Collage selection", () => {
    it("shows select dropdown when page is not in any collage", () => {
      const collages = createCollages();

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      expect(wrapper.find("select").exists()).toBe(true);
      expect(wrapper.find("option[value='null']").text()).toBe(
        "Select collage"
      );
    });

    it("disables full collages in dropdown", () => {
      // Page is not in any collage
      const collages = [
        {
          id: 1,
          pages: Array(10).fill({ id: 2 }),
          is_archived: false
        },
        { id: 2, pages: [], is_archived: false }
      ];

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      const options = wrapper.findAll("option");
      expect(options.length).toBeGreaterThanOrEqual(3);
      expect(options[1].attributes("disabled")).toBeDefined();
      expect(options[1].text()).toContain("(Full)");
      expect(options[2].attributes("disabled")).toBeUndefined();
    });

    it("disables entire select when all collages are full", () => {
      // Page is not in any collage
      const collages = [
        {
          id: 1,
          pages: Array(10).fill({ id: 2 }),
          is_archived: false
        },
        {
          id: 2,
          pages: Array(10).fill({ id: 2 }),
          is_archived: false
        }
      ];

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      const select = wrapper.find("select");
      expect(select.exists()).toBe(true);
      expect(select.attributes("disabled")).toBeDefined();
      expect(wrapper.find("option[value='null']").text()).toBe(
        "All collages are full"
      );
    });

    it("ignores archived collages when checking availability", () => {
      // Page is not in any collage
      const collages = [
        {
          id: 1,
          pages: Array(10).fill({ id: 2 }),
          is_archived: true
        },
        { id: 2, pages: [], is_archived: false }
      ];

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      const select = wrapper.find("select");
      expect(select.exists()).toBe(true);
      expect(select.attributes("disabled")).toBeUndefined();
      expect(wrapper.find("option[value='null']").text()).toBe(
        "Select collage"
      );
    });
  });

  describe("Add to collage functionality", () => {
    it("disables button when no collage is selected", () => {
      const collages = createCollages();

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      const addButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Add to Collage"));
      expect(addButton.attributes("disabled")).toBeDefined();
    });

    it("disables button when all collages are full", () => {
      // Page is not in any collage
      const collages = [
        {
          id: 1,
          pages: Array(10).fill({ id: 2 }),
          is_archived: false
        },
        {
          id: 2,
          pages: Array(10).fill({ id: 2 }),
          is_archived: false
        },
        {
          id: 3,
          pages: Array(10).fill({ id: 2 }),
          is_archived: false
        }
      ];

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      const addButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Add to Collage"));
      expect(addButton.attributes("disabled")).toBeDefined();
    });

    it("enables button when collage is selected and available", async () => {
      const collages = createCollages();

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      // Select a collage
      await wrapper.find("select").setValue(1);

      const addButton = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Add to Collage"));
      expect(addButton.attributes("disabled")).toBeUndefined();
    });

    it("submits form when add button is clicked", async () => {
      const collages = createCollages();

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      // Select a collage
      const select = wrapper.find("select");
      await select.setValue(1);
      await nextTick();

      // Check if button is enabled before clicking
      const button = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Add to Collage"));
      expect(button.attributes("disabled")).toBeUndefined();

      // Click add button
      await button.trigger("click");

      expect(mockForm.post).toHaveBeenCalledWith("/collage-page.store", {
        preserveScroll: true,
        onSuccess: expect.any(Function)
      });
    });

    it("shows success message after successful submission", async () => {
      const collages = createCollages();

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      // Select a collage
      await wrapper.find("select").setValue(1);
      await nextTick();

      // Click add button
      const button = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Add to Collage"));
      await button.trigger("click");

      // Simulate successful submission
      expect(mockForm.post).toHaveBeenCalled();
      const onSuccessCallback = mockForm.post.mock.calls[0][1].onSuccess;
      onSuccessCallback();
      await nextTick();

      expect(wrapper.text()).toContain("Page successfully added to collage!");
      expect(mockForm.reset).toHaveBeenCalled();
    });

    it("hides success message after 3 seconds", async () => {
      vi.useFakeTimers();

      const collages = createCollages();

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      // Select a collage and submit
      await wrapper.find("select").setValue(1);
      await nextTick();
      const button = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Add to Collage"));
      await button.trigger("click");

      // Simulate successful submission
      expect(mockForm.post).toHaveBeenCalled();
      const onSuccessCallback = mockForm.post.mock.calls[0][1].onSuccess;
      onSuccessCallback();
      await nextTick();

      expect(wrapper.text()).toContain("Page successfully added to collage!");

      // Fast forward 3 seconds
      vi.advanceTimersByTime(3000);
      await nextTick();

      expect(wrapper.text()).not.toContain(
        "Page successfully added to collage!"
      );

      vi.useRealTimers();
    });

    it("resets success message when collage selection changes", async () => {
      const collages = createCollages();

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      // Select a collage and submit
      await wrapper.find("select").setValue(1);
      await nextTick();
      const button = wrapper
        .findAll("button")
        .find((btn) => btn.text().includes("Add to Collage"));
      await button.trigger("click");

      // Simulate successful submission
      expect(mockForm.post).toHaveBeenCalled();
      const onSuccessCallback = mockForm.post.mock.calls[0][1].onSuccess;
      onSuccessCallback();
      await nextTick();

      expect(wrapper.text()).toContain("Page successfully added to collage!");

      // Change collage selection
      await wrapper.find("select").setValue(2);
      await nextTick();

      expect(wrapper.text()).not.toContain(
        "Page successfully added to collage!"
      );
    });
  });

  describe("Computed properties", () => {
    it("correctly identifies when page is in any collage", () => {
      const collages = createCollages([
        { id: 1, pages: [{ id: 1 }], deleted_at: null, is_archived: false }
      ]);

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      expect(wrapper.text()).toContain("This picture is in collage");
    });

    it("correctly identifies when page is not in any collage", () => {
      const collages = createCollages();

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      expect(wrapper.text()).not.toContain("This picture is in collage");
      expect(wrapper.find("select").exists()).toBe(true);
    });

    it("correctly identifies available collages", () => {
      // Page is not in any collage
      const collages = [
        {
          id: 1,
          pages: Array(10).fill({ id: 2 }),
          deleted_at: null,
          is_archived: false
        },
        { id: 2, pages: [], deleted_at: null, is_archived: false }
      ];

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      const select = wrapper.find("select");
      expect(select.exists()).toBe(true);
      expect(select.attributes("disabled")).toBeUndefined();
    });

    it("correctly identifies when no collages are available", () => {
      // Page is not in any collage
      const collages = [
        {
          id: 1,
          pages: Array(10).fill({ id: 2 }),
          deleted_at: null,
          is_archived: false
        },
        {
          id: 2,
          pages: Array(10).fill({ id: 2 }),
          deleted_at: null,
          is_archived: false
        }
      ];

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      const select = wrapper.find("select");
      expect(select.exists()).toBe(true);
      expect(select.attributes("disabled")).toBeDefined();
    });
  });

  describe("Display number calculation", () => {
    it("returns correct display number for collage", () => {
      const collages = createCollages();

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages
        }
      });

      // Add page to first collage
      const collagesWithPage = createCollages([
        { id: 1, pages: [{ id: 1 }], deleted_at: null, is_archived: false }
      ]);

      wrapper = mount(AddToCollageButton, {
        props: {
          pageId: 1,
          collages: collagesWithPage
        }
      });

      expect(wrapper.text()).toContain("#1");
    });
  });
});
