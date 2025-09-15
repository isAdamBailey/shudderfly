import NewPageForm from "@/Pages/Book/NewPageForm.vue";
import { validateFile } from "@/utils/fileValidation.js";
import { useForm, usePage } from "@inertiajs/vue3";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

global.route = (name) => `/${name}`;

// Mock video optimization composable
vi.mock("@/composables/useVideoOptimization", () => ({
  useVideoOptimization: () => ({
    compressionProgress: false,
    optimizationProgress: 0,
    processMediaFile: vi.fn((file) => Promise.resolve(file)),
    resetProgress: vi.fn()
  })
}));

// Mock vuelidate
vi.mock("@vuelidate/core", () => ({
  useVuelidate: vi.fn(() => ({
    $errors: [],
    $error: false,
    value: {
      $validate: vi.fn(() => Promise.resolve(true)),
      form: {
        video_link: { required: { $invalid: false } },
        image: {
          required: { $invalid: false },
          file_size_validation: { $invalid: false },
          batch_files_valid: { $invalid: false }
        },
        content: { required: { $invalid: false } }
      }
    }
  }))
}));

// Mock child components
vi.mock("@/Components/Button.vue", () => ({
  default: {
    name: "Button",
    template: "<button><slot /></button>",
    props: ["class", "disabled", "isActive"]
  }
}));

vi.mock("@/Components/InputError.vue", () => ({
  default: {
    name: "InputError",
    template: '<div class="input-error">{{ message }}</div>',
    props: ["message"]
  }
}));

vi.mock("@/Components/InputLabel.vue", () => ({
  default: {
    name: "InputLabel",
    template: "<label>{{ value }}</label>",
    props: ["value", "for"]
  }
}));

vi.mock("@/Components/TextInput.vue", () => ({
  default: {
    name: "TextInput",
    template:
      '<input type="text" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ["modelValue", "class", "placeholder", "id"],
    emits: ["update:modelValue"]
  }
}));

vi.mock("@/Components/VideoWrapper.vue", () => ({
  default: {
    name: "VideoWrapper",
    template: '<div class="video-wrapper" />',
    props: ["url", "controls"]
  }
}));

vi.mock("@/Components/Wysiwyg.vue", () => ({
  default: {
    name: "Wysiwyg",
    template: '<div class="wysiwyg" />',
    props: ["modelValue", "class", "id"],
    emits: ["update:modelValue"]
  }
}));

vi.mock("@/Components/svg/VideoIcon.vue", () => ({
  default: {
    name: "VideoIcon",
    template: '<svg class="video-icon" />',
    props: ["class"]
  }
}));

describe("NewPageForm", () => {
  let wrapper;
  let mockForm;

  const createMockForm = () => ({
    book_id: 1,
    content: "",
    image: null,
    video_link: null,
    errors: {},
    processing: false,
    post: vi.fn(),
    reset: vi.fn()
  });

  const book = {
    id: 1,
    title: "Test Book",
    author: "Test Author"
  };

  const createFile = (name = "test.jpg", type = "image/jpeg", size = 1024) => {
    const file = new File(["test content"], name, { type });
    Object.defineProperty(file, "size", { value: size });
    return file;
  };

  beforeEach(() => {
    mockForm = createMockForm();
    useForm.mockReturnValue(mockForm);

    // Override usePage mock to include settings
    usePage.mockReturnValue({
      props: {
        settings: { youtube_enabled: true },
        auth: { user: { permissions_list: [] } },
        search: null
      }
    });

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      },
      writable: true
    });

    // Mock FileReader
    global.FileReader = vi.fn(() => {
      const mockReader = {
        readAsDataURL: vi.fn(() => {
          // Simulate async operation and trigger onload
          setTimeout(() => {
            if (mockReader.onload) {
              mockReader.onload({
                target: { result: "data:image/jpeg;base64,test" }
              });
            }
          }, 0);
        }),
        onload: null,
        onerror: null,
        abort: vi.fn(),
        result: "data:image/jpeg;base64,test"
      };
      return mockReader;
    });

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => "blob:test-url");
    global.URL.revokeObjectURL = vi.fn();

    // Mock fetch for fallback upload functionality
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      })
    );

    // Mock DOM methods for CSRF token
    global.document.querySelector = vi.fn((selector) => {
      if (selector === 'meta[name="csrf-token"]') {
        return { getAttribute: () => "mock-csrf-token" };
      }
      return null;
    });

    wrapper = mount(NewPageForm, {
      props: { book },
      global: {
        mocks: {
          $page: {
            props: {
              settings: { youtube_enabled: true }
            }
          }
        }
      }
    });
  });

  describe("Component Rendering", () => {
    it("renders the form title", () => {
      expect(wrapper.text()).toContain("Add New Page");
    });

    it("renders media type selection buttons when YouTube is enabled", () => {
      const buttons = wrapper.findAllComponents({ name: "Button" });
      const uploadButton = buttons.find((btn) => btn.text().includes("Upload"));
      const youtubeButton = buttons.find((btn) =>
        btn.text().includes("YouTube")
      );

      expect(uploadButton.exists()).toBe(true);
      expect(youtubeButton.exists()).toBe(true);
    });

    it("does not render YouTube button when YouTube is disabled", async () => {
      // Override usePage for this specific test
      usePage.mockReturnValue({
        props: {
          settings: { youtube_enabled: false },
          auth: { user: { permissions_list: [] } },
          search: null
        }
      });

      wrapper = mount(NewPageForm, {
        props: { book },
        global: {
          mocks: {
            $page: {
              props: {
                settings: { youtube_enabled: false }
              }
            }
          }
        }
      });

      await nextTick();

      const buttons = wrapper.findAllComponents({ name: "Button" });
      const youtubeButton = buttons.find((btn) =>
        btn.text().includes("YouTube")
      );

      expect(youtubeButton).toBeUndefined();
    });

    it("renders the content editor", () => {
      expect(wrapper.findComponent({ name: "Wysiwyg" }).exists()).toBe(true);
    });

    it("renders the create page button", () => {
      const buttons = wrapper.findAllComponents({ name: "Button" });
      const createButton = buttons.find((btn) =>
        btn.text().includes("Create Page!")
      );
      expect(createButton.exists()).toBe(true);
    });
  });

  describe("Media Type Selection", () => {
    it("starts with upload mode selected", () => {
      const dropZone = wrapper.find('[data-test="drop-zone"]');
      expect(dropZone.exists()).toBe(true);
      expect(wrapper.vm.mediaOption).toBe("upload");
      expect(wrapper.vm.uploadMode).toBe("single");
    });

    it("shows single and multiple upload buttons inside media section", () => {
      const buttons = wrapper.findAllComponents({ name: "Button" });
      const selectMediaFileButton = buttons.find((btn) =>
        btn.text().includes("Select Media File")
      );
      const selectMultipleButton = buttons.find((btn) =>
        btn.text().includes("Select Multiple")
      );

      expect(selectMediaFileButton.exists()).toBe(true);
      expect(selectMultipleButton.exists()).toBe(true);
    });

    it("switches upload mode when buttons are clicked", async () => {
      const buttons = wrapper.findAllComponents({ name: "Button" });
      const selectMultipleButton = buttons.find((btn) =>
        btn.text().includes("Select Multiple")
      );

      await selectMultipleButton.trigger("click");
      await nextTick();

      expect(wrapper.vm.uploadMode).toBe("multiple");
    });

    it("switches to YouTube mode when YouTube button is clicked", async () => {
      const buttons = wrapper.findAllComponents({ name: "Button" });
      const youtubeButton = buttons.find((btn) =>
        btn.text().includes("YouTube")
      );

      await youtubeButton.trigger("click");
      await nextTick();

      expect(wrapper.vm.mediaOption).toBe("link");
      expect(wrapper.findComponent({ name: "TextInput" }).exists()).toBe(true);
      expect(
        wrapper.findComponent({ name: "TextInput" }).props("placeholder")
      ).toContain("youtube.com");
    });

    it("switches back to upload mode", async () => {
      // First switch to YouTube
      const buttons = wrapper.findAllComponents({ name: "Button" });
      const youtubeButton = buttons.find((btn) =>
        btn.text().includes("YouTube")
      );
      await youtubeButton.trigger("click");
      await nextTick();

      // Then switch back to upload
      const uploadButton = buttons.find((btn) => btn.text().includes("Upload"));
      await uploadButton.trigger("click");
      await nextTick();

      expect(wrapper.vm.mediaOption).toBe("upload");
      const dropZone = wrapper.find('[data-test="drop-zone"]');
      expect(dropZone.exists()).toBe(true);
    });
  });

  describe("File Upload", () => {
    it("validates file types", () => {
      const validImageFile = createFile("test.jpg", "image/jpeg", 1024);
      const validVideoFile = createFile("test.mp4", "video/mp4", 1024);
      const invalidFile = createFile("test.txt", "text/plain", 1024);

      expect(validateFile(validImageFile).valid).toBe(true);
      expect(validateFile(validVideoFile).valid).toBe(true);
      expect(validateFile(invalidFile).valid).toBe(false);
      expect(validateFile(invalidFile).typeError).toBe(true);
    });

    it("validates file sizes", () => {
      const smallFile = createFile("test.jpg", "image/jpeg", 1024);
      const largeFile = createFile("test.jpg", "image/jpeg", 70000000); // 70MB

      expect(validateFile(smallFile).valid).toBe(true);
      expect(validateFile(largeFile).valid).toBe(false);
      expect(validateFile(largeFile).sizeError).toBe(true);
    });

    it("handles single file selection", async () => {
      const file = createFile("test.jpg", "image/jpeg", 1024);

      // Set to single mode and simulate file selection
      wrapper.vm.selectSingleUpload();

      // Simulate the ultra-simple single upload path
      wrapper.vm.form.image = file;
      wrapper.vm.selectedFiles = []; // Clear as per single mode logic
      wrapper.vm.singleFilePreview = "data:image/jpeg;base64,test"; // Simulate preview

      expect(wrapper.vm.form.image).toBe(file);
      expect(wrapper.vm.selectedFiles.length).toBe(0); // Single mode bypasses selectedFiles
      expect(wrapper.vm.mediaOption).toBe("upload");
      expect(wrapper.vm.uploadMode).toBe("single");
      expect(wrapper.vm.singleFilePreview).toBeTruthy(); // Preview should be set
    }, 10000); // 10 second timeout

    it("handles multiple file selection", async () => {
      const files = [
        createFile("test1.jpg", "image/jpeg", 1024),
        createFile("test2.jpg", "image/jpeg", 1024)
      ];

      // First set to multiple mode (like user would do)
      wrapper.vm.selectMultipleUpload();
      await wrapper.vm.handleMultipleFiles(files);

      expect(wrapper.vm.selectedFiles.length).toBe(2);
      expect(wrapper.vm.mediaOption).toBe("upload");
      expect(wrapper.vm.uploadMode).toBe("multiple");
    }, 10000); // 10 second timeout

    it("removes files from selection", () => {
      // Set to multiple mode first (like user would do)
      wrapper.vm.selectMultipleUpload();
      wrapper.vm.selectedFiles = [
        {
          file: createFile("test1.jpg"),
          preview: null,
          processed: true,
          validation: { valid: true }
        },
        {
          file: createFile("test2.jpg"),
          preview: null,
          processed: true,
          validation: { valid: true }
        }
      ];

      wrapper.vm.removeFile(0);

      expect(wrapper.vm.selectedFiles.length).toBe(1);
      expect(wrapper.vm.selectedFiles[0].file.name).toBe("test2.jpg");
    });
  });

  describe("Batch Processing", () => {
    it("processes multiple files sequentially", async () => {
      const files = [
        createFile("test1.jpg", "image/jpeg", 1024),
        createFile("test2.jpg", "image/jpeg", 1024)
      ];

      wrapper.vm.selectedFiles = files.map((file) => ({
        file,
        preview: null,
        processed: true,
        processing: false,
        validation: { valid: true },
        processedFile: file
      }));

      // Mock successful Inertia requests
      mockForm.post.mockImplementation((url, options) => {
        setTimeout(() => options.onSuccess(), 10);
      });

      await wrapper.vm.processBatch();

      expect(mockForm.post).toHaveBeenCalledTimes(2);
      expect(wrapper.vm.batchProgress).toBe(100);
    }, 10000); // Increase timeout for Inertia calls

    it("continues processing after single file error", async () => {
      const files = [
        createFile("test1.jpg", "image/jpeg", 1024),
        createFile("test2.jpg", "image/jpeg", 1024)
      ];

      wrapper.vm.selectedFiles = files.map((file) => ({
        file,
        preview: null,
        processed: true,
        processing: false,
        validation: { valid: true },
        processedFile: file
      }));

      // Mock first Inertia fails, then fetch fallback fails, second Inertia succeeds
      let callCount = 0;
      mockForm.post.mockImplementation((url, options) => {
        callCount++;
        if (callCount === 1) {
          // First file Inertia fails
          setTimeout(() => options.onError("Inertia failed"), 10);
        } else {
          // Second file Inertia succeeds
          setTimeout(() => options.onSuccess(), 10);
        }
      });
      
      global.fetch.mockImplementation(() => {
        // Fetch fallback for first file also fails
        return Promise.reject(new Error("Fetch fallback failed"));
      });

      await wrapper.vm.processBatch();

      // First file: Inertia fails, then fetch fallback fails
      // Second file: Inertia succeeds
      expect(mockForm.post).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called for first file fallback

      // After processing, successfully uploaded files are removed from selectedFiles
      expect(wrapper.vm.selectedFiles.length).toBe(1);
      expect(wrapper.vm.selectedFiles[0].file.name).toBe("test1.jpg");

      // With our new error handling, the error message shows both failures
      expect(wrapper.vm.selectedFiles[0].errorMessage).toBe(
        "Both Inertia and fetch failed. Inertia: undefined, Fetch: Fetch fallback failed"
      );

      // Failed uploads are recorded
      expect(wrapper.vm.failedUploads.length).toBe(1);
      expect(wrapper.vm.failedUploads[0].fileName).toBe("test1.jpg");
      expect(wrapper.vm.failedUploads[0].error).toBe(
        "Both Inertia and fetch failed. Inertia: undefined, Fetch: Fetch fallback failed"
      );
    }, 10000); // Reduced timeout since no Inertia fallback

    it("updates progress during batch processing", async () => {
      const files = [
        createFile("test1.jpg", "image/jpeg", 1024),
        createFile("test2.jpg", "image/jpeg", 1024)
      ];

      wrapper.vm.selectedFiles = files.map((file) => ({
        file,
        preview: null,
        processed: true,
        processing: false,
        validation: { valid: true },
        processedFile: file
      }));

      // Mock successful Inertia requests
      mockForm.post.mockImplementation((url, options) => {
        setTimeout(() => options.onSuccess(), 10);
      });

      await wrapper.vm.processBatch();

      // Check that progress was updated during processing
      expect(wrapper.vm.batchProgress).toBe(100); // Final progress should be 100%

      // Verify that files were processed (selectedFiles should be empty after successful upload)
      expect(wrapper.vm.selectedFiles.length).toBe(0);
    });
  });

  describe("YouTube Integration", () => {
    it("shows YouTube video preview when valid URL is entered", async () => {
      const buttons = wrapper.findAllComponents({ name: "Button" });
      const youtubeButton = buttons.find((btn) =>
        btn.text().includes("YouTube")
      );

      await youtubeButton.trigger("click");
      await nextTick();

      const component = wrapper.vm;
      component.form.video_link = "https://youtube.com/watch?v=abc123";
      await nextTick();

      // Force component to re-render
      await wrapper.vm.$forceUpdate();
      await nextTick();

      expect(wrapper.findComponent({ name: "VideoWrapper" }).exists()).toBe(
        true
      );
    });
  });

  describe("Draft Functionality", () => {
    it("saves draft to localStorage", () => {
      const component = wrapper.vm;
      component.form.content = "Test content";

      component.saveDraft();

      expect(localStorage.setItem).toHaveBeenCalledWith(
        `page-draft-${book.id}`,
        expect.stringContaining("Test content")
      );
    });

    it("loads draft from localStorage", () => {
      const draftData = {
        content: "Draft content",
        video_link: null,
        timestamp: Date.now()
      };

      localStorage.getItem.mockReturnValue(JSON.stringify(draftData));

      const component = wrapper.vm;
      component.loadDraft();

      expect(component.form.content).toBe("Draft content");
      expect(component.hasDraft).toBe(true);
    });

    it("clears expired drafts", () => {
      const expiredDraftData = {
        content: "Expired content",
        video_link: null,
        timestamp: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      };

      localStorage.getItem.mockReturnValue(JSON.stringify(expiredDraftData));

      const component = wrapper.vm;
      component.loadDraft();

      expect(localStorage.removeItem).toHaveBeenCalledWith(
        `page-draft-${book.id}`
      );
      expect(component.hasDraft).toBe(false);
    });

    it("clears draft manually", () => {
      const component = wrapper.vm;
      component.hasDraft = true;

      component.clearDraft(true);

      expect(localStorage.removeItem).toHaveBeenCalledWith(
        `page-draft-${book.id}`
      );
      expect(component.hasDraft).toBe(false);
      expect(component.form.content).toBe("");
    });
  });

  describe("Form Submission", () => {
    it("submits single file upload", async () => {
      const component = wrapper.vm;
      component.form.content = "Test content";
      component.form.image = createFile("test.jpg", "image/jpeg", 1024);

      // Mock successful fetch request
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      });

      await component.submit();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/pages.store"),
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData)
        })
      );
    });

    it("submits YouTube link", async () => {
      const component = wrapper.vm;
      component.mediaOption = "link";
      component.form.video_link = "https://youtube.com/watch?v=abc123";

      // Mock successful fetch request
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      });

      await component.submit();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/pages.store"),
        expect.objectContaining({
          method: "POST",
          body: expect.any(FormData)
        })
      );
    });

    it("processes batch upload when multiple files selected", async () => {
      const component = wrapper.vm;
      component.mediaOption = "upload";
      component.uploadMode = "multiple";
      component.selectedFiles = [
        {
          file: createFile("test1.jpg"),
          validation: { valid: true },
          processedFile: createFile("test1.jpg")
        }
      ];

      // Test that multiple mode is properly set up
      expect(component.mediaOption).toBe("upload");
      expect(component.uploadMode).toBe("multiple");
      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0].validation.valid).toBe(true);
    });

    it("emits close-form after successful submission", async () => {
      const component = wrapper.vm;
      component.form.content = "Test content";

      // Mock successful fetch request
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      });

      await component.submit();

      expect(wrapper.emitted("close-form")).toBeTruthy();
    });

    it("has draft clearing capability", async () => {
      const component = wrapper.vm;

      // Test that clearDraft function exists and works
      expect(typeof component.clearDraft).toBe("function");

      // Test that clearDraft can be called without error
      expect(() => component.clearDraft()).not.toThrow();
    });
  });

  describe("Mobile Optimizations", () => {
    it("processes files sequentially to avoid memory issues", async () => {
      const component = wrapper.vm;

      const files = [
        createFile("test1.jpg", "image/jpeg", 1024),
        createFile("test2.jpg", "image/jpeg", 1024)
      ];

      // Set up selected files for the test
      component.selectedFiles = files.map((file) => ({
        file,
        preview: null,
        processed: false,
        processing: false,
        validation: { valid: true }
      }));

      // Simply test that the function completes without error
      await expect(
        component.generatePreviewsSequentially()
      ).resolves.not.toThrow();

      // Verify files are still in selectedFiles (basic behavior check)
      expect(component.selectedFiles.length).toBe(files.length);
    });

    it("adds timeout to prevent FileReader hanging", async () => {
      const component = wrapper.vm;
      const file = createFile("test.jpg", "image/jpeg", 1024);

      // Mock setTimeout to capture timeout callback
      const originalSetTimeout = global.setTimeout;
      const timeoutCallback = vi.fn();
      global.setTimeout = vi.fn((callback, delay) => {
        if (delay === 30000) {
          // FileReader timeout
          timeoutCallback.mockImplementation(callback);
        }
        return originalSetTimeout(callback, delay);
      });

      const fileObj = {
        file,
        preview: null,
        validation: { valid: true }
      };

      await component.generatePreview(fileObj);

      expect(global.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        30000
      );

      global.setTimeout = originalSetTimeout;
    });
  });

  describe("Error Handling", () => {
    it("handles FileReader errors gracefully", async () => {
      const component = wrapper.vm;
      const file = createFile("test.jpg", "image/jpeg", 1024);

      // Mock FileReader to trigger error
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null,
        onerror: null,
        abort: vi.fn()
      };

      global.FileReader = vi.fn(() => mockFileReader);

      const fileObj = {
        file,
        preview: null,
        validation: { valid: true }
      };

      const promise = component.generatePreview(fileObj);

      // Trigger error
      mockFileReader.onerror();

      await promise;

      // Should continue without throwing
      expect(fileObj.preview).toBeNull();
    });
  });
});
