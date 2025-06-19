import Login from "@/Pages/Auth/Login.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the components
vi.mock("@/Components/Checkbox.vue", () => ({
  default: {
    name: "Checkbox",
    template: '<input type="checkbox" class="checkbox" />',
    props: ["checked", "name"]
  }
}));

vi.mock("@/Components/GuestLayout.vue", () => ({
  default: {
    name: "GuestLayout",
    template: '<div class="guest-layout"><slot /></div>'
  }
}));

vi.mock("@/Components/InputError.vue", () => ({
  default: {
    name: "InputError",
    template: '<div class="input-error"><slot /></div>',
    props: ["message", "class"]
  }
}));

vi.mock("@/Components/InputLabel.vue", () => ({
  default: {
    name: "InputLabel",
    template: '<label class="input-label"><slot /></label>',
    props: ["for", "value"]
  }
}));

vi.mock("@/Components/PrimaryButton.vue", () => ({
  default: {
    name: "PrimaryButton",
    template:
      '<button class="primary-button" :disabled="disabled"><slot /></button>',
    props: ["class", "disabled"]
  }
}));

vi.mock("@/Components/TextInput.vue", () => ({
  default: {
    name: "TextInput",
    template:
      '<input class="text-input" :type="type" :id="id" :required="required" :autofocus="autofocus" :autocomplete="autocomplete" />',
    props: ["id", "type", "class", "required", "autofocus", "autocomplete"]
  }
}));

describe("Login.vue", () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(Login, {
      props: {
        canResetPassword: true,
        status: null
      },
      global: {
        provide: {
          route: global.route
        }
      }
    });
  });

  describe("Component Rendering", () => {
    it("renders the login form", () => {
      expect(wrapper.find("form").exists()).toBe(true);
    });

    it("renders email input field", () => {
      const emailInput = wrapper.find('input[type="email"]');
      expect(emailInput.exists()).toBe(true);
    });

    it("renders password input field", () => {
      const passwordInput = wrapper.find('input[type="password"]');
      expect(passwordInput.exists()).toBe(true);
    });

    it("renders login button", () => {
      const loginButton = wrapper.find(".primary-button");
      expect(loginButton.exists()).toBe(true);
      expect(loginButton.text()).toBe("Log in");
    });

    it("renders remember me checkbox", () => {
      const checkbox = wrapper.find(".checkbox");
      expect(checkbox.exists()).toBe(true);
    });
  });

  describe("Form Elements", () => {
    it("has proper form labels", () => {
      const labels = wrapper.findAll(".input-label");
      expect(labels.length).toBeGreaterThan(0);
    });

    it("has proper input attributes", () => {
      const emailInput = wrapper.find('input[type="email"]');
      expect(emailInput.attributes("required")).toBeDefined();
      expect(emailInput.attributes("autocomplete")).toBe("username");
    });
  });

  describe("Props Handling", () => {
    it("accepts canResetPassword prop", () => {
      wrapper = mount(Login, {
        props: {
          canResetPassword: false,
          status: null
        },
        global: {
          provide: {
            route: global.route
          }
        }
      });
      expect(wrapper.props("canResetPassword")).toBe(false);
    });

    it("accepts status prop", () => {
      wrapper = mount(Login, {
        props: {
          canResetPassword: true,
          status: "Test status message"
        },
        global: {
          provide: {
            route: global.route
          }
        }
      });
      expect(wrapper.props("status")).toBe("Test status message");
    });
  });

  describe("Status Display", () => {
    it("shows status message when provided", () => {
      wrapper = mount(Login, {
        props: {
          canResetPassword: true,
          status: "Test status message"
        },
        global: {
          provide: {
            route: global.route
          }
        }
      });

      const statusElement = wrapper.find(".text-green-600");
      expect(statusElement.exists()).toBe(true);
      expect(statusElement.text()).toBe("Test status message");
    });

    it("does not show status message when not provided", () => {
      const statusElement = wrapper.find(".text-green-600");
      expect(statusElement.exists()).toBe(false);
    });
  });
});
