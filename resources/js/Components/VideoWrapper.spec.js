import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import VideoWrapper from './VideoWrapper.vue';

describe('VideoWrapper', () => {
  it('renders correctly with iframe', () => {
    const wrapper = mount(VideoWrapper, {
      props: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        iframe: true,
        title: 'Test Video',
        controls: true,
      },
    });
    expect(wrapper.html()).toContain('iframe');
  });

  it('renders correctly with LiteYouTubeEmbed', () => {
    const wrapper = mount(VideoWrapper, {
      props: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        iframe: false,
        title: 'Test Video',
        controls: true,
      },
    });
    expect(wrapper.html()).toContain('lite-youtube');
  });

  it('renders playlist correctly with iframe', () => {
    const wrapper = mount(VideoWrapper, {
      props: {
        url: 'https://www.youtube.com/playlist?list=PL9tY0BWXOZFt7i7o1X5z5z5z5z5z5z5z5',
        iframe: false,
        title: 'Test Playlist',
        controls: true,
      },
    });
    expect(wrapper.html()).toContain('iframe');
  });
});
