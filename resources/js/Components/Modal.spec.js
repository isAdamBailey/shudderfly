import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import Modal from './Modal.vue';

describe('Modal', () => {
  it('renders correctly', () => {
    const wrapper = mount(Modal, {
      props: {
        show: true,
        maxWidth: '2xl',
        closeable: true,
      },
    });
    expect(wrapper.html()).toContain('div');
  });

  it('emits close event when close method is called', async () => {
    const wrapper = mount(Modal, {
      props: {
        show: true,
        maxWidth: '2xl',
        closeable: true,
      },
    });
    await wrapper.vm.close();
    expect(wrapper.emitted().close).toBeTruthy();
  });
});
