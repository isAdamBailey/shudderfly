import Welcome from "@/Pages/Welcome.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the components
vi.mock("@/Components/ApplicationLogo.vue", () => ({
  default: {
    name: "ApplicationLogo",
    template: '<div class="application-logo">Logo</div>',
    props: ["title"]
  }
}));

describe("Welcome.vue", () => {
  let wrapper;

  beforeEach(() => {
    // No need to mock route anymore; global mock is set in setup.js
  });

  describe("Component Rendering", () => {
    it("renders the welcome page with default props", () => {
      wrapper = mount(Welcome, {
        props: {
          appName: "Shudderfly"
        },
        global: {
          provide: {
            $page: {
              props: {
                auth: {
                  user: null
                }
              }
            }
          }
        }
      });

      expect(wrapper.find("h1").text()).toBe("Shudderfly");
      expect(wrapper.find("p").text()).toContain(
        "Colin's very own app to make books!"
      );
    });

    it("renders with custom app name", () => {
      wrapper = mount(Welcome, {
        props: {
          appName: "Custom App"
        },
        global: {
          provide: {
            $page: {
              props: {
                auth: {
                  user: null
                }
              }
            }
          }
        }
      });

      expect(wrapper.find("h1").text()).toBe("Custom App");
    });
  });

  describe("Interactive Elements", () => {
    beforeEach(() => {
      wrapper = mount(Welcome, {
        props: {
          appName: "Shudderfly"
        },
        global: {
          provide: {
            $page: {
              props: {
                auth: {
                  user: null
                }
              }
            }
          }
        }
      });
    });

    it("toggles bookClicked state when name is clicked", async () => {
      const nameSpan = wrapper.find("p span");

      // Initial state
      expect(wrapper.vm.bookClicked).toBe(false);

      // Click the name
      await nameSpan.trigger("click");
      expect(wrapper.vm.bookClicked).toBe(true);

      // Click again to toggle back
      await nameSpan.trigger("click");
      expect(wrapper.vm.bookClicked).toBe(false);
    });

    it("toggles bookClicked state when logo area is clicked", async () => {
      const logoArea = wrapper.find(".w-full.max-h-sm");

      // Initial state
      expect(wrapper.vm.bookClicked).toBe(false);

      // Click the logo area
      await logoArea.trigger("click");
      expect(wrapper.vm.bookClicked).toBe(true);

      // Click again to toggle back
      await logoArea.trigger("click");
      expect(wrapper.vm.bookClicked).toBe(false);
    });

    it("applies correct CSS class when bookClicked is true", async () => {
      const nameSpan = wrapper.find("p span");

      // Click to set bookClicked to true
      await nameSpan.trigger("click");

      // Check if the correct class is applied
      expect(nameSpan.classes()).toContain("text-blue-600");
      expect(nameSpan.classes()).toContain("dark:text-yellow-400");
      expect(nameSpan.classes()).toContain("christmas:text-christmas-silver");
    });
  });

  describe("Conditional Rendering", () => {
    it("shows authenticated user content when user is logged in", () => {
      // Override the global $page mock for this test to simulate an authenticated user
      wrapper = mount(Welcome, {
        props: {
          appName: "Shudderfly"
        },
        global: {
          mocks: {
            $page: {
              props: {
                auth: {
                  user: { id: 1, name: "Test User" },
                  search: null
                }
              }
            }
          }
        }
      });

      // Should show Books and Uploads buttons
      expect(wrapper.text()).toContain("Books");
      expect(wrapper.text()).toContain("Uploads");
      expect(wrapper.findComponent({ name: "SearchInput" }).exists()).toBe(
        true
      );
    });

    it("shows login/register buttons when user is not authenticated", () => {
      wrapper = mount(Welcome, {
        props: {
          appName: "Shudderfly"
        },
        global: {
          mocks: {
            $page: {
              props: {
                auth: {
                  user: null
                },
                search: null
              }
            }
          }
        }
      });

      // Should show Login and Register buttons
      expect(wrapper.text()).toContain("Log In");
      expect(wrapper.text()).toContain("Register");
      expect(wrapper.findComponent({ name: "SearchInput" }).exists()).toBe(
        false
      );
    });
  });

  describe("Image Display", () => {
    it("shows ApplicationLogo when bookClicked is false", () => {
      wrapper = mount(Welcome, {
        props: {
          appName: "Shudderfly"
        },
        global: {
          provide: {
            $page: {
              props: {
                auth: {
                  user: null
                }
              }
            }
          }
        }
      });

      expect(wrapper.findComponent({ name: "ApplicationLogo" }).exists()).toBe(
        true
      );
      expect(wrapper.find("img").exists()).toBe(false);
    });

    it("shows Colin image when bookClicked is true", async () => {
      wrapper = mount(Welcome, {
        props: {
          appName: "Shudderfly"
        },
        global: {
          provide: {
            $page: {
              props: {
                auth: {
                  user: null
                }
              }
            }
          }
        }
      });

      // Click to toggle bookClicked
      await wrapper.find("p span").trigger("click");

      expect(wrapper.findComponent({ name: "ApplicationLogo" }).exists()).toBe(
        false
      );
      expect(wrapper.find("img").exists()).toBe(true);
      expect(wrapper.find("img").attributes("src")).toBe("/img/colin.png");
      expect(wrapper.find("img").attributes("alt")).toBe("Picture of Colin");
    });
  });

  describe("Props Validation", () => {
    it("uses default appName when not provided", () => {
      wrapper = mount(Welcome, {
        global: {
          provide: {
            $page: {
              props: {
                auth: {
                  user: null
                }
              }
            }
          }
        }
      });

      expect(wrapper.find("h1").text()).toBe("");
    });

    it("accepts string appName prop", () => {
      wrapper = mount(Welcome, {
        props: {
          appName: "Test App Name"
        },
        global: {
          provide: {
            $page: {
              props: {
                auth: {
                  user: null
                }
              }
            }
          }
        }
      });

      expect(wrapper.find("h1").text()).toBe("Test App Name");
    });
  });
});
