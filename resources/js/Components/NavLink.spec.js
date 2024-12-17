import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import NavLink from './NavLink.vue';

describe('NavLink', () => {
  it('renders correctly', () => {
    const wrapper = mount(NavLink, {
      props: {
        href: '/test',
        active: false,
      },
    });
    expect(wrapper.html()).toContain('a');
  });

  it('applies active class when active', () => {
    const wrapper = mount(NavLink, {
      props: {
        href: '/test',
        active: true,
      },
    });
    expect(wrapper.classes()).toContain('border-yellow-200');
  });
});
