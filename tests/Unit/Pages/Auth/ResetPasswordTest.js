import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ResetPassword from '@/resources/js/Pages/Auth/ResetPassword.vue';

describe('ResetPassword', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(ResetPassword);
    expect(wrapper.exists()).toBe(true);
  });

  it('has an email input field', () => {
    const wrapper = mount(ResetPassword);
    const emailInput = wrapper.find('input[type="email"]');
    expect(emailInput.exists()).toBe(true);
  });

  it('has a password input field', () => {
    const wrapper = mount(ResetPassword);
    const passwordInput = wrapper.find('input[type="password"]');
    expect(passwordInput.exists()).toBe(true);
  });

  it('has a password confirmation input field', () => {
    const wrapper = mount(ResetPassword);
    const passwordConfirmationInput = wrapper.find('input[type="password"]');
    expect(passwordConfirmationInput.exists()).toBe(true);
  });

  it('has a reset password button', () => {
    const wrapper = mount(ResetPassword);
    const resetPasswordButton = wrapper.find('button');
    expect(resetPasswordButton.exists()).toBe(true);
  });
});
