import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import PrimaryButton from './PrimaryButton.vue';

describe('PrimaryButton', () => {
  it('renders correctly', () => {
    const wrapper = mount(PrimaryButton, {
      props: {
        type: 'submit',
      },
    });
    expect(wrapper.html()).toContain('button');
  });
});
