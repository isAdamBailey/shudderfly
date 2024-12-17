import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Index from './Index.vue';

describe('Index', () => {
  it('renders correctly', () => {
    const wrapper = mount(Index, {
      props: {
        users: {
          data: [
            { name: 'User 1', email: 'user1@example.com', permissions_list: ['edit pages'] },
            { name: 'User 2', email: 'user2@example.com', permissions_list: [] },
          ],
        },
        stats: {
          numberOfBooks: 10,
          numberOfPages: 100,
          mostPages: { title: 'Book 1', slug: 'book-1', pages_count: 50 },
          leastPages: { title: 'Book 2', slug: 'book-2', pages_count: 1 },
        },
        categories: {
          data: [
            { name: 'Category 1', books_count: 5 },
            { name: 'Category 2', books_count: 3 },
          ],
        },
      },
    });
    expect(wrapper.html()).toContain('The Administrative Duties Of Colin\'s Books!');
  });
});
