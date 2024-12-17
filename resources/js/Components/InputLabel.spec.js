import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import InputLabel from './InputLabel.vue';

describe('InputLabel', () => {
  it('renders correctly with value prop', () => {
    const wrapper = mount(InputLabel, {
      props: {
        value: 'Test Label',
      },
    });
    expect(wrapper.html()).toContain('Test Label');
  });

  it('renders correctly with slot content', () => {
    const wrapper = mount(InputLabel, {
      slots: {
        default: 'Slot Content',
      },
    });
    expect(wrapper.html()).toContain('Slot Content');
  });
});
