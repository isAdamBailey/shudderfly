import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Show from '@/resources/js/Pages/Book/Show.vue';

describe('Show', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(Show, {
      props: {
        book: {
          title: 'Sample Book',
          cover_image: { media_path: 'sample-path' },
          author: 'Sample Author',
          created_at: '2023-01-01',
          read_count: 100,
          excerpt: 'Sample Excerpt',
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
    expect(wrapper.exists()).toBe(true);
  });

  it('displays the book title', () => {
    const wrapper = mount(Show, {
      props: {
        book: {
          title: 'Sample Book',
          cover_image: { media_path: 'sample-path' },
          author: 'Sample Author',
          created_at: '2023-01-01',
          read_count: 100,
          excerpt: 'Sample Excerpt',
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
    const title = wrapper.find('h2');
    expect(title.text()).toBe('SAMPLE BOOK');
  });

  it('displays the book author', () => {
    const wrapper = mount(Show, {
      props: {
        book: {
          title: 'Sample Book',
          cover_image: { media_path: 'sample-path' },
          author: 'Sample Author',
          created_at: '2023-01-01',
          read_count: 100,
          excerpt: 'Sample Excerpt',
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
    const author = wrapper.find('p');
    expect(author.text()).toContain('by: Sample Author');
  });
});
