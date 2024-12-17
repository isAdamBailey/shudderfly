import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Index from './Index.vue';

describe('Index', () => {
  it('renders correctly', () => {
    const wrapper = mount(Index, {
      props: {
        categories: [
          {
            name: 'Category 1',
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
        ],
        authors: ['Author 1', 'Author 2'],
      },
    });
    expect(wrapper.html()).toContain('Test Book 1');
    expect(wrapper.html()).toContain('Test Book 2');
  });
});
