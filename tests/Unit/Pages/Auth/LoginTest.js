import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Login from '@/resources/js/Pages/Auth/Login.vue';

describe('Login', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(Login);
    expect(wrapper.exists()).toBe(true);
  });

  it('has an email input field', () => {
    const wrapper = mount(Login);
    const emailInput = wrapper.find('input[type="email"]');
    expect(emailInput.exists()).toBe(true);
  });

  it('has a password input field', () => {
    const wrapper = mount(Login);
    const passwordInput = wrapper.find('input[type="password"]');
    expect(passwordInput.exists()).toBe(true);
  });

  it('has a remember me checkbox', () => {
    const wrapper = mount(Login);
    const rememberMeCheckbox = wrapper.find('input[type="checkbox"]');
    expect(rememberMeCheckbox.exists()).toBe(true);
  });

  it('has a submit button', () => {
    const wrapper = mount(Login);
    const submitButton = wrapper.find('button');
    expect(submitButton.exists()).toBe(true);
  });
});
