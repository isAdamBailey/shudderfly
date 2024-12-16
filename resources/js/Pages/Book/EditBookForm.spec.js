import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import EditBookForm from './EditBookForm.vue';

describe('EditBookForm', () => {
  it('renders correctly', () => {
    const wrapper = mount(EditBookForm, {
      props: {
        book: {
          title: 'Test Book',
          excerpt: 'Test Excerpt',
          author: 'Test Author',
          category_id: 1,
        },
        authors: ['Author 1', 'Author 2'],
      },
    });
    expect(wrapper.html()).toContain('Edit Book');
  });
});
