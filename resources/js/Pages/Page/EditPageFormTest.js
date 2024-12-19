import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EditPageForm from '@/resources/js/Pages/Page/EditPageForm.vue';

describe('EditPageForm', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(EditPageForm, {
      props: {
        page: {
          content: 'Sample content',
          book_id: 1,
          video_link: 'https://sample-link.com',
        },
        book: {
          cover_page: 1,
        },
        showPageSettings: false,
        books: [],
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('has a content input field', () => {
    const wrapper = mount(EditPageForm, {
      props: {
        page: {
          content: 'Sample content',
          book_id: 1,
          video_link: 'https://sample-link.com',
        },
        book: {
          cover_page: 1,
        },
        showPageSettings: false,
        books: [],
      },
    });
    const contentInput = wrapper.find('textarea');
    expect(contentInput.exists()).toBe(true);
  });

  it('has a save button', () => {
    const wrapper = mount(EditPageForm, {
      props: {
        page: {
          content: 'Sample content',
          book_id: 1,
          video_link: 'https://sample-link.com',
        },
        book: {
          cover_page: 1,
        },
        showPageSettings: false,
        books: [],
      },
    });
    const saveButton = wrapper.find('button');
    expect(saveButton.exists()).toBe(true);
  });
});
