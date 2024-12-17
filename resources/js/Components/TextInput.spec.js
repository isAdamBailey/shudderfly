import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import TextInput from './TextInput.vue';

describe('TextInput', () => {
  it('renders correctly', () => {
    const wrapper = mount(TextInput, {
      props: {
        modelValue: 'Test Value',
      },
    });
    expect(wrapper.html()).toContain('input');
  });

  it('updates modelValue when input changes', async () => {
    const wrapper = mount(TextInput, {
      props: {
        modelValue: 'Test Value',
      },
    });
    const input = wrapper.find('input');
    await input.setValue('New Value');
    expect(wrapper.emitted()['update:modelValue'][0]).toEqual(['New Value']);
  });
});
