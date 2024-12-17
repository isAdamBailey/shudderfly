import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ScrollTop from './ScrollTop.vue';

describe('ScrollTop', () => {
  it('renders correctly', () => {
    const wrapper = mount(ScrollTop);
    expect(wrapper.html()).toContain('button');
  });

  it('shows button when scrolled down', async () => {
    const wrapper = mount(ScrollTop);
    window.scrollY = 100;
    window.dispatchEvent(new Event('scroll'));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('div').classes()).not.toContain('invisible');
  });

  it('hides button when scrolled to top', async () => {
    const wrapper = mount(ScrollTop);
    window.scrollY = 0;
    window.dispatchEvent(new Event('scroll'));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('div').classes()).toContain('invisible');
  });

  it('scrolls to top when button is clicked', async () => {
    const wrapper = mount(ScrollTop);
    window.scrollTo = jest.fn();
    await wrapper.find('button').trigger('click');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
