import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DeleteBookForm from '@/resources/js/Pages/Book/DeleteBookForm.vue';

describe('DeleteBookForm', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(DeleteBookForm, {
      props: {
        book: {
          slug: 'test-book',
        },
      },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('has a delete button', () => {
    const wrapper = mount(DeleteBookForm, {
      props: {
        book: {
          slug: 'test-book',
        },
      },
    });
    const deleteButton = wrapper.find('button');
    expect(deleteButton.exists()).toBe(true);
  });

  it('prompts for confirmation before deleting', async () => {
    const wrapper = mount(DeleteBookForm, {
      props: {
        book: {
          slug: 'test-book',
        },
      },
    });
    window.confirm = vi.fn(() => true);
    await wrapper.find('form').trigger('submit.prevent');
    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this book and all its pages?'
    );
  });
});
