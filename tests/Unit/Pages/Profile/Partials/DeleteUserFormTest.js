import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DeleteUserForm from '@/resources/js/Pages/Profile/Partials/DeleteUserForm.vue';

describe('DeleteUserForm', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(DeleteUserForm);
    expect(wrapper.exists()).toBe(true);
  });

  it('has a delete button', () => {
    const wrapper = mount(DeleteUserForm);
    const deleteButton = wrapper.find('button');
    expect(deleteButton.exists()).toBe(true);
  });

  it('has a password input field in the modal', async () => {
    const wrapper = mount(DeleteUserForm);
    await wrapper.find('button').trigger('click');
    const passwordInput = wrapper.find('input[type="password"]');
    expect(passwordInput.exists()).toBe(true);
  });

  it('has a cancel button in the modal', async () => {
    const wrapper = mount(DeleteUserForm);
    await wrapper.find('button').trigger('click');
    const cancelButton = wrapper.find('button').filter((btn) => btn.text() === 'Cancel');
    expect(cancelButton.exists()).toBe(true);
  });

  it('has a confirm delete button in the modal', async () => {
    const wrapper = mount(DeleteUserForm);
    await wrapper.find('button').trigger('click');
    const confirmDeleteButton = wrapper.find('button').filter((btn) => btn.text() === 'Delete Account');
    expect(confirmDeleteButton.exists()).toBe(true);
  });
});
