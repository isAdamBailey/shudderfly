import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ValidationErrors from './ValidationErrors.vue';

describe('ValidationErrors', () => {
  it('renders correctly when there are errors', () => {
    const wrapper = mount(ValidationErrors, {
      global: {
        mocks: {
          $page: {
            props: {
              errors: {
                email: 'The email field is required.',
                password: 'The password field is required.',
              },
            },
          },
        },
      },
    });
    expect(wrapper.html()).toContain('Whoops! Something went wrong.');
    expect(wrapper.html()).toContain('The email field is required.');
    expect(wrapper.html()).toContain('The password field is required.');
  });

  it('does not render when there are no errors', () => {
    const wrapper = mount(ValidationErrors, {
      global: {
        mocks: {
          $page: {
            props: {
              errors: {},
            },
          },
        },
      },
    });
    expect(wrapper.html()).toBe('');
  });
});
