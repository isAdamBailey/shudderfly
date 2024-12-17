import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import SearchInput from './SearchInput.vue';

describe('SearchInput', () => {
  it('renders correctly', () => {
    const wrapper = mount(SearchInput, {
      props: {
        routeName: 'test-route',
        label: 'Test Label',
      },
    });
    expect(wrapper.html()).toContain('input');
  });

  it('updates search value when typed', async () => {
    const wrapper = mount(SearchInput, {
      props: {
        routeName: 'test-route',
        label: 'Test Label',
      },
    });
    const input = wrapper.find('input');
    await input.setValue('test search');
    expect(wrapper.vm.search).toBe('test search');
  });

  it('calls searchMethod on enter key press', async () => {
    const wrapper = mount(SearchInput, {
      props: {
        routeName: 'test-route',
        label: 'Test Label',
      },
    });
    const input = wrapper.find('input');
    const searchMethodSpy = jest.spyOn(wrapper.vm, 'searchMethod');
    await input.trigger('keyup.enter');
    expect(searchMethodSpy).toHaveBeenCalled();
  });
});
