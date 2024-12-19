import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BooksGrid from '@/resources/js/Pages/Books/BooksGrid.vue';

describe('BooksGrid', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(BooksGrid, {
      props: {
        category: { name: 'test-category', books: [] },
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('displays the correct title', () => {
    const wrapper = mount(BooksGrid, {
      props: {
        category: { name: 'test-category', books: [] },
      },
    });
    const title = wrapper.find('h3');
    expect(title.text()).toBe('Test-category');
  });

  it('displays books correctly', () => {
    const books = [
      { id: 1, title: 'Book 1', excerpt: 'Excerpt 1', cover_image: { media_path: 'path/to/image1.jpg' } },
      { id: 2, title: 'Book 2', excerpt: 'Excerpt 2', cover_image: { media_path: 'path/to/image2.jpg' } },
    ];
    const wrapper = mount(BooksGrid, {
      props: {
        category: { name: 'test-category', books },
      },
    });
    const bookElements = wrapper.findAll('a');
    expect(bookElements.length).toBe(books.length);
    expect(bookElements[0].text()).toContain('Book 1');
    expect(bookElements[1].text()).toContain('Book 2');
  });
});
