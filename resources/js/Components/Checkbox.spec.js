import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Checkbox from './Checkbox.vue';

describe('Checkbox', () => {
  it('renders correctly', () => {
    const wrapper = mount(Checkbox, {
      props: {
        checked: false,
        value: 'test-value',
      },
    });
    expect(wrapper.html()).toContain('input');
  });

  it('updates checked value when clicked', async () => {
    const wrapper = mount(Checkbox, {
      props: {
        checked: false,
        value: 'test-value',
      },
    });
    const input = wrapper.find('input');
    await input.setChecked();
    expect(wrapper.emitted()['update:checked'][0]).toEqual([true]);
  });
});
