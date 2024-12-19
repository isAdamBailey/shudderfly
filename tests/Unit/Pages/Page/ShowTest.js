import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Show from '@/resources/js/Pages/Page/Show.vue';

describe('Show', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(Show);
    expect(wrapper.exists()).toBe(true);
  });

  it('has a title', () => {
    const wrapper = mount(Show);
    const title = wrapper.find('h2');
    expect(title.exists()).toBe(true);
  });

  it('has a back button', () => {
    const wrapper = mount(Show);
    const backButton = wrapper.find('button');
    expect(backButton.exists()).toBe(true);
  });
});
