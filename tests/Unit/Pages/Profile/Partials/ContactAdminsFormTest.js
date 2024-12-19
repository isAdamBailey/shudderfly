import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ContactAdminsForm from '@/resources/js/Pages/Profile/Partials/ContactAdminsForm.vue';

describe('ContactAdminsForm', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(ContactAdminsForm);
    expect(wrapper.exists()).toBe(true);
  });

  it('displays the correct title', () => {
    const wrapper = mount(ContactAdminsForm);
    const title = wrapper.find('h2');
    expect(title.text()).toBe('Contact Admins');
  });

  it('displays the correct description', () => {
    const wrapper = mount(ContactAdminsForm);
    const description = wrapper.find('p');
    expect(description.text()).toContain('Send messages to mom and dad!');
  });

  it('renders ContactAdminsCommButtons components', () => {
    const wrapper = mount(ContactAdminsForm);
    const buttons = wrapper.findAllComponents({ name: 'ContactAdminsCommButtons' });
    expect(buttons.length).toBe(4);
  });
});
