import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ApplicationLogo from './ApplicationLogo.vue';

describe('ApplicationLogo', () => {
  it('renders correctly', () => {
    const wrapper = mount(ApplicationLogo);
    expect(wrapper.html()).toContain('<svg');
  });
});
