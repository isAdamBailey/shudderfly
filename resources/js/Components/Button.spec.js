import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Button from './Button.vue';

describe('Button', () => {
  it('renders correctly', () => {
    const wrapper = mount(Button, {
      props: {
        type: 'submit',
        disabled: false,
        isActive: false,
      },
    });
    expect(wrapper.html()).toContain('button');
  });
});
