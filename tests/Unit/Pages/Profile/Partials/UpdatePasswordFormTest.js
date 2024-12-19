import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UpdatePasswordForm from '@/resources/js/Pages/Profile/Partials/UpdatePasswordForm.vue';

describe('UpdatePasswordForm', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(UpdatePasswordForm);
    expect(wrapper.exists()).toBe(true);
  });

  it('has a current password input field', () => {
    const wrapper = mount(UpdatePasswordForm);
    const currentPasswordInput = wrapper.find('input[id="current_password"]');
    expect(currentPasswordInput.exists()).toBe(true);
  });

  it('has a new password input field', () => {
    const wrapper = mount(UpdatePasswordForm);
    const newPasswordInput = wrapper.find('input[id="password"]');
    expect(newPasswordInput.exists()).toBe(true);
  });

  it('has a password confirmation input field', () => {
    const wrapper = mount(UpdatePasswordForm);
    const passwordConfirmationInput = wrapper.find('input[id="password_confirmation"]');
    expect(passwordConfirmationInput.exists()).toBe(true);
  });

  it('has a save button', () => {
    const wrapper = mount(UpdatePasswordForm);
    const saveButton = wrapper.find('button');
    expect(saveButton.exists()).toBe(true);
  });
});
