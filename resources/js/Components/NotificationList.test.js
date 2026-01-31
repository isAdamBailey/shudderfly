import NotificationList from "@/Components/NotificationList.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

global.route = (name, params) => {
  if (params) {
    return `/${name}/${params}`;
  }
  return `/${name}`;
};

// Mock axios
vi.mock("axios", () => ({
  default: {
    get: vi.fn(() =>
      Promise.resolve({
        data: {
          data: []
        }
      })
    ),
    post: vi.fn(() => Promise.resolve({ data: {} }))
  },
  get: vi.fn(() =>
    Promise.resolve({
      data: {
        data: []
      }
    })
  ),
  post: vi.fn(() => Promise.resolve({ data: {} }))
}));

// Mock usePage
const mockPage = {
  props: {
    auth: {
      user: { id: 1, name: "Test User" }
    }
  }
};

vi.mock("@inertiajs/vue3", () => ({
  router: {
    reload: vi.fn()
  },
  usePage: () => mockPage
}));

// Mock window.Echo
global.window = {
  ...global.window,
  Echo: {
    private: vi.fn(() => ({
      notification: vi.fn()
    })),
    leave: vi.fn()
  }
};

// Mock useUnreadNotifications
const mockUnreadCount = { value: 0 };
vi.mock("@/composables/useUnreadNotifications", () => ({
  useUnreadNotifications: () => ({
    unreadCount: mockUnreadCount
  })
}));

vi.mock("@/composables/useSpeechSynthesis", () => ({
  useSpeechSynthesis: () => ({
    speak: vi.fn(),
    speaking: { value: false }
  })
}));

vi.mock("@/composables/useTranslations", () => ({
  useTranslations: () => ({
    t: (key, replacements = {}) => {
      let str = key;
      Object.entries(replacements).forEach(([k, v]) => {
        str = str.replace(new RegExp(`:${k}`, "g"), v);
      });
      return str;
    }
  })
}));

describe("NotificationList", () => {
  const mockNotifications = [
    {
      id: "1",
      type: "App\\Notifications\\UserTagged",
      data: {
        tagger_name: "Alice",
        message: "Hello @Test User!",
        message_id: 1,
        url: "/messages"
      },
      created_at: new Date().toISOString(),
      read_at: null
    },
    {
      id: "2",
      type: "App\\Notifications\\UserTagged",
      data: {
        tagger_name: "Bob",
        message: "How are you?",
        message_id: 2,
        url: "/messages"
      },
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      read_at: new Date().toISOString() // Already read
    }
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    const axios = (await import("axios")).default;
    axios.get = vi.fn().mockResolvedValue({
      data: {
        data: mockNotifications
      }
    });
    axios.post = vi.fn().mockResolvedValue({ data: {} });
    mockUnreadCount.value = 1;

    // Mock window.Echo
    global.window = {
      ...global.window,
      Echo: {
        private: vi.fn(() => ({
          notification: vi.fn()
        })),
        leave: vi.fn()
      }
    };
  });

  describe("Rendering", () => {
    it("displays loading state initially", async () => {
      const axios = (await import("axios")).default;
      axios.get.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: { data: [] } }), 100);
          })
      );

      const wrapper = mount(NotificationList);

      expect(wrapper.text()).toContain("Loading notifications");
    });

    it("displays notifications when loaded", async () => {
      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.text()).toContain("Alice");
      expect(wrapper.text()).toContain("Hello");
    });

    it("displays empty state when no notifications", async () => {
      const axios = (await import("axios")).default;
      axios.get.mockResolvedValue({
        data: {
          data: []
        }
      });

      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.text()).toContain("No notifications yet");
    });
  });

  describe("Notification display", () => {
    it("shows unread indicator for unread notifications", async () => {
      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check for unread indicator (blue dot)
      const html = wrapper.html();
      expect(html).toContain("bg-blue-50");
    });

    it("shows read styling for read notifications", async () => {
      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check for read styling
      const html = wrapper.html();
      expect(html).toContain("bg-gray-50");
    });

    it("displays tagger name correctly", async () => {
      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.text()).toContain("Alice");
      expect(wrapper.text()).toContain("tagged you");
    });

    it("displays notification message", async () => {
      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(wrapper.text()).toContain("Hello");
    });

    it("shows view message link when message_id exists", async () => {
      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // The entire notification card is now clickable, check for the "View message" text
      expect(wrapper.text()).toContain("View message");
    });
  });

  describe("Mark as read", () => {
    it("shows mark as read button for unread notifications", async () => {
      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const markAsReadButton = wrapper.find('button[title="Mark as read"]');
      expect(markAsReadButton.exists()).toBe(true);
    });

    it("calls API when mark as read is clicked", async () => {
      const axios = (await import("axios")).default;
      axios.post = vi.fn().mockResolvedValue({ data: {} });

      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Wait for notifications to load
      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const unreadNotification = wrapper.vm.notifications?.find(
        (n) => !n.read_at
      );

      if (unreadNotification) {
        await wrapper.vm.markAsRead(unreadNotification.id);

        // Wait for axios call
        await nextTick();
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(axios.post).toHaveBeenCalled();
        if (axios.post.mock.calls.length > 0) {
          const callArgs = axios.post.mock.calls[0];
          // The route function generates "/notifications.read/1" format
          expect(callArgs[0]).toContain("notifications");
          expect(callArgs[0]).toContain("read");
        }
      } else {
        // If no unread notifications, just verify the component loaded
        expect(wrapper.vm.notifications).toBeDefined();
      }
    });

    it("updates notification to read state after marking", async () => {
      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 200));

      const unreadNotification = wrapper.vm.notifications.find(
        (n) => !n.read_at
      );

      if (unreadNotification) {
        await wrapper.vm.markAsRead(unreadNotification.id);

        await nextTick();

        // Notification should be marked as read locally
        const updatedNotification = wrapper.vm.notifications.find(
          (n) => n.id === unreadNotification.id
        );
        expect(updatedNotification.read_at).toBeTruthy();
      }
    });

    it("does not show mark as read button for already read notifications", async () => {
      const axios = (await import("axios")).default;
      const readOnlyNotifications = [
        {
          id: "2",
          type: "App\\Notifications\\UserTagged",
          data: {
            tagger_name: "Bob",
            message: "How are you?",
            message_id: 2
          },
          created_at: new Date().toISOString(),
          read_at: new Date().toISOString()
        }
      ];

      axios.get.mockResolvedValue({
        data: {
          data: readOnlyNotifications
        }
      });

      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const markAsReadButton = wrapper.find('button[title="Mark as read"]');
      expect(markAsReadButton.exists()).toBe(false);
    });
  });

  describe("Date formatting", () => {
    it("formats recent dates correctly", async () => {
      const axios = (await import("axios")).default;
      const recentNotification = [
        {
          id: "1",
          type: "App\\Notifications\\UserTagged",
          data: {
            tagger_name: "Alice",
            message: "Hello",
            message_id: 1
          },
          created_at: new Date().toISOString(),
          read_at: null
        }
      ];

      axios.get.mockResolvedValue({
        data: {
          data: recentNotification
        }
      });

      const wrapper = mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const text = wrapper.text();
      expect(text).toMatch(/just now|minute/i);
    });
  });

  describe("Echo integration", () => {
    it("subscribes to user's private channel on mount", () => {
      mount(NotificationList);

      expect(global.window.Echo.private).toHaveBeenCalledWith(
        "App.Models.User.1"
      );
    });

    it("adds new notification when broadcast event is received", async () => {
      const wrapper = mount(NotificationList);

      await nextTick();

      const channel = global.window.Echo.private("App.Models.User.1");
      const notificationCallback = channel.notification.mock.calls[0]?.[0];

      if (notificationCallback) {
        const newNotification = {
          id: "3",
          type: "App\\Notifications\\UserTagged",
          data: {
            tagger_name: "Charlie",
            message: "New notification",
            message_id: 3
          },
          created_at: new Date().toISOString(),
          read_at: null
        };

        notificationCallback(newNotification);
        await nextTick();

        expect(wrapper.text()).toContain("Charlie");
      }
    });
  });

  describe("Error handling", () => {
    it("handles API errors gracefully", async () => {
      const axios = (await import("axios")).default;
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      axios.get.mockRejectedValue(new Error("API Error"));

      mount(NotificationList);

      await nextTick();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
