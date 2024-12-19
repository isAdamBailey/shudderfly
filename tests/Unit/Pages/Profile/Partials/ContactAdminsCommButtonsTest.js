import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ContactAdminsCommButtons from '@/resources/js/Pages/Profile/Partials/ContactAdminsCommButtons.vue';

describe('ContactAdminsCommButtons', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(ContactAdminsCommButtons, {
      props: {
        message: 'Test message',
        title: 'Test title',
        icon: 'ri-test-icon',
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('displays the correct title', () => {
    const wrapper = mount(ContactAdminsCommButtons, {
      props: {
        message: 'Test message',
        title: 'Test title',
        icon: 'ri-test-icon',
      },
    });
    const title = wrapper.find('span');
    expect(title.text()).toBe('Test title Tell them!');
  });

  it('displays the correct icon', () => {
    const wrapper = mount(ContactAdminsCommButtons, {
      props: {
        message: 'Test message',
        title: 'Test title',
        icon: 'ri-test-icon',
      },
    });
    const icon = wrapper.find('i');
    expect(icon.classes()).toContain('ri-test-icon');
  });

  it('has a say it button', () => {
    const wrapper = mount(ContactAdminsCommButtons, {
      props: {
        message: 'Test message',
        title: 'Test title',
        icon: 'ri-test-icon',
      },
    });
    const sayItButton = wrapper.find('button');
    expect(sayItButton.exists()).toBe(true);
  });

  it('has an email it button', () => {
    const wrapper = mount(ContactAdminsCommButtons, {
      props: {
        message: 'Test message',
        title: 'Test title',
        icon: 'ri-test-icon',
      },
    });
    const emailItButton = wrapper.findAll('button')[1];
    expect(emailItButton.exists()).toBe(true);
  });
});
