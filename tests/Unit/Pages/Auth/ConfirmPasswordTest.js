import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmPassword from '@/resources/js/Pages/Auth/ConfirmPassword.vue';

describe('ConfirmPassword', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(ConfirmPassword);
    expect(wrapper.exists()).toBe(true);
  });

  it('has a password input field', () => {
    const wrapper = mount(ConfirmPassword);
    const passwordInput = wrapper.find('input[type="password"]');
    expect(passwordInput.exists()).toBe(true);
  });

  it('has a confirm button', () => {
    const wrapper = mount(ConfirmPassword);
    const confirmButton = wrapper.find('button');
    expect(confirmButton.exists()).toBe(true);
  });
});
