import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import InputError from './InputError.vue';

describe('InputError', () => {
  it('renders correctly', () => {
    const wrapper = mount(InputError, {
      props: {
        message: 'Test error message',
      },
    });
    expect(wrapper.html()).toContain('Test error message');
  });
});
