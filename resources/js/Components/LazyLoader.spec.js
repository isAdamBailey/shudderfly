import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import LazyLoader from './LazyLoader.vue';

describe('LazyLoader', () => {
  it('renders correctly', () => {
    const wrapper = mount(LazyLoader, {
      props: {
        src: 'test-image.jpg',
        poster: 'test-poster.jpg',
        alt: 'test image',
        classes: 'test-class',
        isCover: false,
      },
    });
    expect(wrapper.html()).toContain('img');
  });

  it('renders video correctly', () => {
    const wrapper = mount(LazyLoader, {
      props: {
        src: 'test-video.mp4',
        poster: 'test-poster.jpg',
        alt: 'test video',
        classes: 'test-class',
        isCover: false,
      },
    });
    expect(wrapper.html()).toContain('video');
  });

  it('handles media error correctly', async () => {
    const wrapper = mount(LazyLoader, {
      props: {
        src: 'invalid-image.jpg',
        poster: 'test-poster.jpg',
        alt: 'test image',
        classes: 'test-class',
        isCover: false,
      },
    });
    await wrapper.find('img').trigger('error');
    expect(wrapper.vm.imageSrc).toBe('/img/photo-placeholder.png');
  });
});
