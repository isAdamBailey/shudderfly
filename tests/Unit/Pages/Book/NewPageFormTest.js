import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import NewPageForm from '@/resources/js/Pages/Book/NewPageForm.vue';

describe('NewPageForm', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(NewPageForm, {
      props: {
        book: {
          id: 1,
          title: 'Sample Book',
        },
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('has a media upload button', () => {
    const wrapper = mount(NewPageForm, {
      props: {
        book: {
          id: 1,
          title: 'Sample Book',
        },
      },
    });
    const uploadButton = wrapper.find('button');
    expect(uploadButton.exists()).toBe(true);
  });

  it('has a content input field', () => {
    const wrapper = mount(NewPageForm, {
      props: {
        book: {
          id: 1,
          title: 'Sample Book',
        },
      },
    });
    const contentInput = wrapper.find('textarea');
    expect(contentInput.exists()).toBe(true);
  });

  it('has a create page button', () => {
    const wrapper = mount(NewPageForm, {
      props: {
        book: {
          id: 1,
          title: 'Sample Book',
        },
      },
    });
    const createPageButton = wrapper.find('button');
    expect(createPageButton.exists()).toBe(true);
  });
});
