import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import DeleteBookForm from './DeleteBookForm.vue';

describe('DeleteBookForm', () => {
  it('renders correctly', () => {
    const wrapper = mount(DeleteBookForm, {
      props: {
        book: {
          slug: 'test-book',
        },
      },
    });
    expect(wrapper.html()).toContain('Delete Book');
  });
});
