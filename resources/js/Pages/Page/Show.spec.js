import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Show from './Show.vue';

describe('Show', () => {
  it('renders correctly', () => {
    const wrapper = mount(Show, {
      props: {
        page: {
          book: {
            title: 'Test Book',
            slug: 'test-book',
          },
          media_path: 'test-media-path',
          media_poster: 'test-media-poster',
          description: 'Test Description',
          content: 'Test Content',
          created_at: '2023-01-01',
          read_count: 100,
        },
        previousPage: null,
        nextPage: null,
        books: [],
      },
    });
    expect(wrapper.html()).toContain('Test Book');
  });
});
