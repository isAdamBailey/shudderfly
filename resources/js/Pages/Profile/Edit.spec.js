import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Edit from './Edit.vue';

describe('Edit', () => {
  it('renders correctly', () => {
    const wrapper = mount(Edit, {
      props: {
        mustVerifyEmail: false,
        status: false,
      },
    });
    expect(wrapper.html()).toContain('Profile');
  });
});
