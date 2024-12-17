import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import TextArea from './TextArea.vue';

describe('TextArea', () => {
  it('renders correctly', () => {
    const wrapper = mount(TextArea, {
      props: {
        modelValue: 'Test Value',
        size: 'lg',
      },
    });
    expect(wrapper.html()).toContain('textarea');
  });
});
