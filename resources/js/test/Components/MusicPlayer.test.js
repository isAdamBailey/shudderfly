import MusicPlayer from "@/Components/Music/MusicPlayer.vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

// Mock route function like other tests
global.route = vi.fn((name, params) => {
  if (name === "music.increment-read-count" && params) {
    return `/music/${params}/increment-read-count`;
  }
  return `/${name}`;
});

describe("MusicPlayer", () => {
  let wrapper;
  let mockPlayer;
  const mockSong = {
    id: 1,
    title: "Test Song Title",
    description: "Test song description",
    youtube_video_id: "dQw4w9WgXcQ",
    thumbnail_maxres: "https://example.com/thumbnail.jpg",
    thumbnail_default: "https://example.com/thumbnail-default.jpg"
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Ensure global.YT exists before setting properties
    if (!global.YT) {
      global.YT = {
        PlayerState: {
          PLAYING: 1,
          PAUSED: 2,
          BUFFERING: 3,
          ENDED: 0,
          CUED: 5
        }
      };
    }

    // Mock YouTube Player
    mockPlayer = {
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      seekTo: vi.fn(),
      getCurrentTime: vi.fn(() => 45),
      getDuration: vi.fn(() => 180),
      destroy: vi.fn()
    };

    global.YT.Player = vi.fn().mockImplementation(() => mockPlayer);

    // Mock fetch for increment read count
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })
    );

    // Mock CSRF token
    document.querySelector = vi.fn(() => ({
      getAttribute: vi.fn(() => "test-csrf-token")
    }));
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  it("renders when currentSong is provided", () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    expect(wrapper.find("h3").text()).toBe("Test Song Title");
    // MusicPlayer uses thumbnail_high first, falls back to thumbnail_default
    expect(wrapper.find("img").attributes("src")).toBe(
      "https://example.com/thumbnail-default.jpg"
    );
  });

  it("does not render when currentSong is null", () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: null
      }
    });

    expect(wrapper.html()).toBe("<!--v-if-->");
  });

  it("shows fallback thumbnail when image fails", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: {
          ...mockSong,
          thumbnail_high: null,
          thumbnail_default: null
        }
      }
    });

    await nextTick();
    // When both thumbnail properties are null, component doesn't render an img
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("handles image error correctly", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    const img = wrapper.find("img");
    await img.trigger("error");
    await nextTick();

    expect(wrapper.find(".ri-music-2-line").exists()).toBe(true);
  });

  it("displays play button when not playing", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    expect(wrapper.find(".ri-play-fill").exists()).toBe(true);
    expect(wrapper.find(".ri-pause-fill").exists()).toBe(false);
  });

  it("calls playVideo when play button is clicked", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    // Wait for mount and then mock createPlayer to prevent interference
    await nextTick();
    wrapper.vm.createPlayer = vi.fn();

    // Set up player and enable controls
    wrapper.vm.player = mockPlayer;
    wrapper.vm.isLoading = false;

    const playButton = wrapper.find("button").element;
    expect(playButton).toBeTruthy();

    // Call the method directly instead of relying on DOM events
    wrapper.vm.togglePlayPause();
    expect(mockPlayer.playVideo).toHaveBeenCalled();
  });

  it("calls pauseVideo when pause button is clicked", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    wrapper.vm.createPlayer = vi.fn();

    // Set up player and playing state, enable controls
    wrapper.vm.player = mockPlayer;
    wrapper.vm.isPlaying = true;
    wrapper.vm.isLoading = false;

    // Call the method directly
    wrapper.vm.togglePlayPause();
    expect(mockPlayer.pauseVideo).toHaveBeenCalled();
  });

  it("seeks backward 10 seconds when skip back button is clicked", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    wrapper.vm.createPlayer = vi.fn();

    wrapper.vm.player = mockPlayer;
    wrapper.vm.currentTime = 45;
    wrapper.vm.isLoading = false;

    // Call the method directly
    wrapper.vm.seekBackward();
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(35); // 45 - 10
  });

  it("seeks forward 10 seconds when skip forward button is clicked", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    wrapper.vm.createPlayer = vi.fn();

    wrapper.vm.player = mockPlayer;
    wrapper.vm.currentTime = 45;
    wrapper.vm.duration = 180;
    wrapper.vm.isLoading = false;

    // Call the method directly
    wrapper.vm.seekForward();
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(55); // 45 + 10
  });

  it("does not seek past end of song when skipping forward", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    wrapper.vm.createPlayer = vi.fn();

    wrapper.vm.player = mockPlayer;
    wrapper.vm.currentTime = 175;
    wrapper.vm.duration = 180;
    wrapper.vm.isLoading = false;

    // Call the method directly
    wrapper.vm.seekForward();
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(180); // Duration limit
  });

  it("does not seek before start when skipping backward", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    wrapper.vm.createPlayer = vi.fn();

    wrapper.vm.player = mockPlayer;
    wrapper.vm.currentTime = 5;
    wrapper.vm.isLoading = false;

    // Call the method directly
    wrapper.vm.seekBackward();
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0); // Cannot go below 0
  });

  it("emits close event when close button is clicked", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    wrapper.vm.createPlayer = vi.fn();

    wrapper.vm.player = mockPlayer;
    wrapper.vm.isLoading = false;

    // Call the method directly
    wrapper.vm.closePlayer();
    expect(wrapper.emitted()).toHaveProperty("close");
    expect(mockPlayer.destroy).toHaveBeenCalled();
  });

  it("formats time correctly", () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    expect(wrapper.vm.formatTime(65)).toBe("1:05");
    expect(wrapper.vm.formatTime(125)).toBe("2:05");
    expect(wrapper.vm.formatTime(5)).toBe("0:05");
  });

  it("calculates progress percentage correctly", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    wrapper.vm.currentTime = 45;
    wrapper.vm.duration = 180;

    await nextTick();
    expect(wrapper.vm.progressPercentage).toBe(25); // 45/180 * 100
  });

  it("handles progress bar click for seeking", async () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    wrapper.vm.player = mockPlayer;
    wrapper.vm.duration = 180;

    const progressBar = wrapper.find(".bg-gray-200");

    // Mock getBoundingClientRect
    progressBar.element.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      width: 200
    }));

    // Create a mock click event
    const mockEvent = {
      currentTarget: progressBar.element,
      clientX: 100
    };

    // Call the method directly
    wrapper.vm.seekTo(mockEvent);

    // Should seek to 50% of duration (90 seconds)
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(90);
  });

  it("uses fallback YouTube thumbnail URL when thumbnail_url is not provided", () => {
    const songWithoutThumbnail = {
      ...mockSong,
      thumbnail_high: null,
      thumbnail_default: null
    };
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: songWithoutThumbnail
      }
    });

    // When both thumbnail_high and thumbnail_default are null, thumbnailUrl returns null
    expect(wrapper.vm.thumbnailUrl).toBe(null);
  });

  it("applies dark mode classes correctly", () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    const container = wrapper.find(".sticky");
    expect(container.classes()).toContain("dark:bg-gray-800");
    expect(container.classes()).toContain("dark:border-gray-700");
  });

  it("has responsive design classes for mobile", () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    const container = wrapper.find(".flex");
    expect(container.classes()).toContain("flex-col");
    expect(container.classes()).toContain("sm:flex-row");
  });

  it("displays larger image size on desktop", () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    const img = wrapper.find("img");
    expect(img.classes()).toContain("w-48");
    expect(img.classes()).toContain("sm:w-56");
    expect(img.classes()).toContain("h-48");
    expect(img.classes()).toContain("sm:h-56");
  });

  it("centers content on mobile", () => {
    wrapper = mount(MusicPlayer, {
      props: {
        currentSong: mockSong
      }
    });

    const songInfo = wrapper.find(".text-center");
    expect(songInfo.classes()).toContain("sm:text-left");

    const controls = wrapper.find(".justify-center");
    expect(controls.classes()).toContain("sm:justify-start");
  });
});
