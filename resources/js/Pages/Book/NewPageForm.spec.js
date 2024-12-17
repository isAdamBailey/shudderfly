import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import NewPageForm from './NewPageForm.vue';

describe('NewPageForm', () => {
  it('renders correctly', () => {
    const wrapper = mount(NewPageForm, {
      props: {
        book: {
          id: 1,
        },
      },
    });
    expect(wrapper.html()).toContain('Add a New Page');
  });
});
