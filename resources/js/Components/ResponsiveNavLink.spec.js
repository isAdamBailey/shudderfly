import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ResponsiveNavLink from './ResponsiveNavLink.vue';

describe('ResponsiveNavLink', () => {
  it('renders correctly', () => {
    const wrapper = mount(ResponsiveNavLink, {
      props: {
        href: '/test-link',
        active: false,
      },
    });
    expect(wrapper.html()).toContain('a');
  });

  it('applies active class when active prop is true', () => {
    const wrapper = mount(ResponsiveNavLink, {
      props: {
        href: '/test-link',
        active: true,
      },
    });
    expect(wrapper.classes()).toContain('border-yellow-200');
  });
});
