import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UpdateProfileInformationForm from '@/resources/js/Pages/Profile/Partials/UpdateProfileInformationForm.vue';

describe('UpdateProfileInformationForm', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(UpdateProfileInformationForm, {
      props: {
        mustVerifyEmail: false,
        status: '',
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('displays the correct title', () => {
    const wrapper = mount(UpdateProfileInformationForm, {
      props: {
        mustVerifyEmail: false,
        status: '',
      },
    });
    const title = wrapper.find('h2');
    expect(title.text()).toBe("Profile Information");
  });

  it('has a name input field', () => {
    const wrapper = mount(UpdateProfileInformationForm, {
      props: {
        mustVerifyEmail: false,
        status: '',
      },
    });
    const nameInput = wrapper.find('input[id="name"]');
    expect(nameInput.exists()).toBe(true);
  });

  it('has an email input field', () => {
    const wrapper = mount(UpdateProfileInformationForm, {
      props: {
        mustVerifyEmail: false,
        status: '',
      },
    });
    const emailInput = wrapper.find('input[id="email"]');
    expect(emailInput.exists()).toBe(true);
  });

  it('has a save button', () => {
    const wrapper = mount(UpdateProfileInformationForm, {
      props: {
        mustVerifyEmail: false,
        status: '',
      },
    });
    const saveButton = wrapper.find('button');
    expect(saveButton.exists()).toBe(true);
  });
});
