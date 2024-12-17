import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Dropdown from './Dropdown.vue';

describe('Dropdown', () => {
  it('renders correctly', () => {
    const wrapper = mount(Dropdown, {
      props: {
        align: 'right',
        width: '48',
        contentClasses: ['py-1', 'bg-gray-100 dark:bg-gray-800'],
      },
    });
    expect(wrapper.html()).toContain('relative');
  });
});
