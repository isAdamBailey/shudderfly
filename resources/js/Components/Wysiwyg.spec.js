import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Wysiwyg from './Wysiwyg.vue';

describe('Wysiwyg', () => {
  it('renders correctly', () => {
    const wrapper = mount(Wysiwyg, {
      props: {
        modelValue: '<p>Test content</p>',
      },
    });
    expect(wrapper.html()).toContain('Test content');
  });
});
