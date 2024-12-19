import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EditBookForm from '@/resources/js/Pages/Book/EditBookForm.vue';

describe('EditBookForm', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(EditBookForm, {
      props: {
        book: {
          title: 'Test Book',
          excerpt: 'Test Excerpt',
          author: 'Test Author',
          category_id: 1,
        },
        authors: [{ name: 'Test Author' }],
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('has a title input field', () => {
    const wrapper = mount(EditBookForm, {
      props: {
        book: {
          title: 'Test Book',
          excerpt: 'Test Excerpt',
          author: 'Test Author',
          category_id: 1,
        },
        authors: [{ name: 'Test Author' }],
      },
    });
    const titleInput = wrapper.find('input#title');
    expect(titleInput.exists()).toBe(true);
  });

  it('has an author input field', () => {
    const wrapper = mount(EditBookForm, {
      props: {
        book: {
          title: 'Test Book',
          excerpt: 'Test Excerpt',
          author: 'Test Author',
          category_id: 1,
        },
        authors: [{ name: 'Test Author' }],
      },
    });
    const authorInput = wrapper.find('input#author');
    expect(authorInput.exists()).toBe(true);
  });

  it('has a category input field', () => {
    const wrapper = mount(EditBookForm, {
      props: {
        book: {
          title: 'Test Book',
          excerpt: 'Test Excerpt',
          author: 'Test Author',
          category_id: 1,
        },
        authors: [{ name: 'Test Author' }],
      },
    });
    const categoryInput = wrapper.find('input#category');
    expect(categoryInput.exists()).toBe(true);
  });

  it('has an excerpt input field', () => {
    const wrapper = mount(EditBookForm, {
      props: {
        book: {
          title: 'Test Book',
          excerpt: 'Test Excerpt',
          author: 'Test Author',
          category_id: 1,
        },
        authors: [{ name: 'Test Author' }],
      },
    });
    const excerptInput = wrapper.find('textarea#excerpt');
    expect(excerptInput.exists()).toBe(true);
  });

  it('has a save button', () => {
    const wrapper = mount(EditBookForm, {
      props: {
        book: {
          title: 'Test Book',
          excerpt: 'Test Excerpt',
          author: 'Test Author',
          category_id: 1,
        },
        authors: [{ name: 'Test Author' }],
      },
    });
    const saveButton = wrapper.find('button');
    expect(saveButton.exists()).toBe(true);
  });
});
