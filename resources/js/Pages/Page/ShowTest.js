import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Show from '@/resources/js/Pages/Page/Show.vue';

describe('Show', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(Show, {
      props: {
        page: {
          book: {
            title: 'Sample Book',
            slug: 'sample-book',
          },
          media_path: 'sample-path',
          media_poster: 'sample-poster',
          description: 'Sample Description',
          created_at: '2023-01-01',
          read_count: 100,
          content: 'Sample Content',
        },
        previousPage: null,
        nextPage: null,
        books: [],
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('displays the book title', () => {
    const wrapper = mount(Show, {
      props: {
        page: {
          book: {
            title: 'Sample Book',
            slug: 'sample-book',
          },
          media_path: 'sample-path',
          media_poster: 'sample-poster',
          description: 'Sample Description',
          created_at: '2023-01-01',
          read_count: 100,
          content: 'Sample Content',
        },
        previousPage: null,
        nextPage: null,
        books: [],
      },
    });
    const title = wrapper.find('h2');
    expect(title.text()).toBe('Sample Book');
  });

  it('displays the page content', () => {
    const wrapper = mount(Show, {
      props: {
        page: {
          book: {
            title: 'Sample Book',
            slug: 'sample-book',
          },
          media_path: 'sample-path',
          media_poster: 'sample-poster',
          description: 'Sample Description',
          created_at: '2023-01-01',
          read_count: 100,
          content: 'Sample Content',
        },
        previousPage: null,
        nextPage: null,
        books: [],
      },
    });
    const content = wrapper.find('.page-content');
    expect(content.html()).toContain('Sample Content');
  });
});
