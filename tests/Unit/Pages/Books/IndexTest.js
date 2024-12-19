import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Index from '@/resources/js/Pages/Books/Index.vue';

describe('Index', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(Index, {
      props: {
        categories: [],
        authors: [],
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('displays the correct title', () => {
    const wrapper = mount(Index, {
      props: {
        categories: [],
        authors: [],
      },
    });
    const title = wrapper.find('h2');
    expect(title.text()).toBe('Books');
  });

  it('displays the new book form when the button is clicked', async () => {
    const wrapper = mount(Index, {
      props: {
        categories: [],
        authors: [],
      },
    });
    const button = wrapper.find('button');
    await button.trigger('click');
    const newBookForm = wrapper.findComponent({ name: 'NewBookForm' });
    expect(newBookForm.exists()).toBe(true);
  });
});
