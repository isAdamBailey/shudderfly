import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CategoriesForm from '@/resources/js/Pages/Dashboard/CategoriesForm.vue';

describe('CategoriesForm', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(CategoriesForm);
    expect(wrapper.exists()).toBe(true);
  });

  it('has a table with categories', () => {
    const wrapper = mount(CategoriesForm);
    const table = wrapper.find('table');
    expect(table.exists()).toBe(true);
  });

  it('has an input field for new category name', () => {
    const wrapper = mount(CategoriesForm);
    const input = wrapper.find('input#category-name');
    expect(input.exists()).toBe(true);
  });

  it('has an add button for new category', () => {
    const wrapper = mount(CategoriesForm);
    const addButton = wrapper.find('button');
    expect(addButton.exists()).toBe(true);
  });
});
