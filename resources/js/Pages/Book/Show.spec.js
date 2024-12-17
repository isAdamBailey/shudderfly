import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Show from './Show.vue';

describe('Show', () => {
  it('renders correctly', () => {
    const wrapper = mount(Show, {
      props: {
        book: {
          title: 'Test Book',
          author: 'Test Author',
          created_at: '2023-01-01',
          read_count: 100,
        },
        pages: {
          data: [],
          total: 0,
        },
        authors: [],
        categories: [],
        similarBooks: [],
      },
    });
    expect(wrapper.html()).toContain('Test Book');
  });
});
