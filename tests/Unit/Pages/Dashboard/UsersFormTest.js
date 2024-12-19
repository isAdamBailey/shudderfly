import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UsersForm from '@/resources/js/Pages/Dashboard/UsersForm.vue';

describe('UsersForm', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(UsersForm);
    expect(wrapper.exists()).toBe(true);
  });

  it('displays the correct number of users', () => {
    const users = {
      data: [
        { name: 'User 1', email: 'user1@example.com', permissions_list: [] },
        { name: 'User 2', email: 'user2@example.com', permissions_list: [] },
      ],
    };
    const wrapper = mount(UsersForm, {
      props: { users },
    });
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBe(users.data.length);
  });

  it('displays user information correctly', () => {
    const users = {
      data: [
        { name: 'User 1', email: 'user1@example.com', permissions_list: [] },
      ],
    };
    const wrapper = mount(UsersForm, {
      props: { users },
    });
    const userName = wrapper.find('tbody tr td:nth-child(1)').text();
    const userEmail = wrapper.find('tbody tr td:nth-child(2)').text();
    expect(userName).toBe(users.data[0].name);
    expect(userEmail).toBe(users.data[0].email);
  });
});
