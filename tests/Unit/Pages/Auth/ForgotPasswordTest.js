import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ForgotPassword from '@/resources/js/Pages/Auth/ForgotPassword.vue';

describe('ForgotPassword', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(ForgotPassword);
    expect(wrapper.exists()).toBe(true);
  });

  it('has an email input field', () => {
    const wrapper = mount(ForgotPassword);
    const emailInput = wrapper.find('input[type="email"]');
    expect(emailInput.exists()).toBe(true);
  });

  it('has a submit button', () => {
    const wrapper = mount(ForgotPassword);
    const submitButton = wrapper.find('button');
    expect(submitButton.exists()).toBe(true);
  });
});
