import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import BooksGrid from './BooksGrid.vue';

describe('BooksGrid', () => {
  it('renders correctly', () => {
    const wrapper = mount(BooksGrid, {
      props: {
        category: {
          name: 'test-category',
          books: [
            {
              id: 1,
              title: 'Test Book 1',
              excerpt: 'Test Excerpt 1',
              cover_image: {
                media_path: 'path/to/image1.jpg',
              },
            },
            {
              id: 2,
              title: 'Test Book 2',
              excerpt: 'Test Excerpt 2',
              cover_image: {
                media_path: 'path/to/image2.jpg',
              },
            },
          ],
        },
      },
    });
    expect(wrapper.html()).toContain('Test Book 1');
    expect(wrapper.html()).toContain('Test Book 2');
  });
});
