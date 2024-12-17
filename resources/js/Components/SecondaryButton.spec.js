import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import SecondaryButton from './SecondaryButton.vue';

describe('SecondaryButton', () => {
  it('renders correctly', () => {
    const wrapper = mount(SecondaryButton, {
      props: {
        type: 'button',
      },
    });
    expect(wrapper.html()).toContain('button');
  });
});
