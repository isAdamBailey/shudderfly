import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import VerifyEmail from '@/resources/js/Pages/Auth/VerifyEmail.vue';

describe('VerifyEmail', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(VerifyEmail);
    expect(wrapper.exists()).toBe(true);
  });

  it('displays the correct message', () => {
    const wrapper = mount(VerifyEmail, {
      props: {
        status: 'verification-link-sent',
      },
    });
    const message = wrapper.find('.text-green-100');
    expect(message.exists()).toBe(true);
    expect(message.text()).toBe(
      'A new verification link has been sent to the email address you provided during registration.'
    );
  });

  it('has a resend verification email button', () => {
    const wrapper = mount(VerifyEmail);
    const resendButton = wrapper.find('button');
    expect(resendButton.exists()).toBe(true);
  });

  it('has a log out link', () => {
    const wrapper = mount(VerifyEmail);
    const logoutLink = wrapper.find('a');
    expect(logoutLink.exists()).toBe(true);
  });
});
