import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import DangerButton from './DangerButton.vue';

describe('DangerButton', () => {
  it('renders correctly', () => {
    const wrapper = mount(DangerButton, {
      props: {
        type: 'submit',
      },
    });
    expect(wrapper.html()).toContain('button');
  });
});
