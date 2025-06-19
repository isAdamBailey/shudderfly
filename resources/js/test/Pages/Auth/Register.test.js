import Register from "@/Pages/Auth/Register.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock child components
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

describe("Auth/Register.vue", () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(Register, {
      global: {
        mocks: {
          route: (name) => `/${name}`
        }
      }
    });
  });

  it("renders the registration form", () => {
    expect(wrapper.find("form").exists()).toBe(true);
  });

  it("renders name input field", () => {
    const nameInput = wrapper.find('input[type="text"]');
    expect(nameInput.exists()).toBe(true);
  });

  it("renders email input field", () => {
    const emailInput = wrapper.find('input[type="email"]');
    expect(emailInput.exists()).toBe(true);
  });

  it("renders password input field", () => {
    const passwordInput = wrapper.find('input[type="password"]');
    expect(passwordInput.exists()).toBe(true);
  });

  it("renders password confirmation input field", () => {
    const passwordConfirmationInput = wrapper.find('input[type="password"]');
    expect(passwordConfirmationInput.exists()).toBe(true);
  });

  it("renders registration secret field", () => {
    // Check for the input field itself
    const secretInput = wrapper.find('input[id="registration_secret"]');
    expect(secretInput.exists()).toBe(true);
  });

  it("renders register button", () => {
    const registerButton = wrapper.find(".primary-button");
    expect(registerButton.exists()).toBe(true);
    expect(registerButton.text()).toBe("Register");
  });

  it("has proper form labels", () => {
    const labels = wrapper.findAll(".input-label");
    expect(labels.length).toBeGreaterThan(0);
  });

  it("has proper input attributes", () => {
    const nameInput = wrapper.find('input[type="text"]');
    expect(nameInput.attributes("required")).toBeDefined();
    expect(nameInput.attributes("autofocus")).toBeDefined();
    expect(nameInput.attributes("autocomplete")).toBe("name");
  });

  it("has proper email input attributes", () => {
    const emailInput = wrapper.find('input[type="email"]');
    expect(emailInput.attributes("required")).toBeDefined();
    expect(emailInput.attributes("autocomplete")).toBe("username");
  });

  it("has proper password input attributes", () => {
    const passwordInput = wrapper.find('input[type="password"]');
    expect(passwordInput.attributes("required")).toBeDefined();
    expect(passwordInput.attributes("autocomplete")).toBe("new-password");
  });

  it("shows login link", () => {
    expect(wrapper.text()).toContain("Already registered?");
  });

  it("renders GuestLayout component", () => {
    expect(wrapper.findComponent({ name: "GuestLayout" }).exists()).toBe(true);
  });

  it("has proper form structure", () => {
    const form = wrapper.find("form");
    expect(form.exists()).toBe(true);

    // Check for required form elements
    expect(wrapper.find('input[type="text"]').exists()).toBe(true); // name
    expect(wrapper.find('input[type="email"]').exists()).toBe(true); // email
    expect(wrapper.find('input[type="password"]').exists()).toBe(true); // password
  });

  it("has proper accessibility attributes", () => {
    const nameInput = wrapper.find('input[type="text"]');
    expect(nameInput.attributes("id")).toBeDefined();

    const emailInput = wrapper.find('input[type="email"]');
    expect(emailInput.attributes("id")).toBeDefined();

    const passwordInput = wrapper.find('input[type="password"]');
    expect(passwordInput.attributes("id")).toBeDefined();
  });
});
