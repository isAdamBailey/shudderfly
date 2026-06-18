import NewPageForm from "@/Pages/Book/NewPageForm.vue";
import { validateFile } from "@/utils/fileValidation.js";
import { useForm, usePage } from "@inertiajs/vue3";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

global.route = (name) => `/${name}`;

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
                    batch_files_valid: { $invalid: false },
                },
                content: { required: { $invalid: false } },
            },
        },
    })),
}));

// Mock child components
vi.mock("@/Components/Button.vue", () => ({
    default: {
        name: "Button",
        template: "<button><slot /></button>",
        props: ["class", "disabled", "isActive", "type"],
    },
}));

vi.mock("@/Components/InputError.vue", () => ({
    default: {
        name: "InputError",
        template: '<div class="input-error">{{ message }}</div>',
        props: ["message"],
    },
}));

vi.mock("@/Components/InputLabel.vue", () => ({
    default: {
        name: "InputLabel",
        template: "<label>{{ value }}</label>",
        props: ["value", "for"],
    },
}));

vi.mock("@/Components/TextInput.vue", () => ({
    default: {
        name: "TextInput",
        template:
            '<input type="text" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        props: ["modelValue", "class", "placeholder", "id"],
        emits: ["update:modelValue"],
    },
}));

vi.mock("@/Components/VideoWrapper.vue", () => ({
    default: {
        name: "VideoWrapper",
        template: '<div class="video-wrapper" />',
        props: ["url", "controls"],
    },
}));

vi.mock("@/Components/Wysiwyg.vue", () => ({
    default: {
        name: "Wysiwyg",
        template: '<div class="wysiwyg" />',
        props: ["modelValue", "class", "id"],
        emits: ["update:modelValue"],
    },
}));

// Mock FilePondUploader to a simple stub component that emits events
vi.mock("@/Components/FilePondUploader.vue", () => ({
    default: {
        name: "FilePondUploader",
        props: [
            "uploadUrl",
            "allowMultiple",
            "acceptedFileTypes",
            "instantUpload",
            "extraData",
            "processVideo",
            "videoThresholdBytes",
        ],
        template:
            '<div class="filepond-uploader" @click="$emit(\'processed\')"></div>',
        // Expose methods so parent can call uploaderRef.process() and getFileCount()
        setup(props, { expose }) {
            const api = {
                process: vi.fn(),
                getFileCount: vi.fn(() => 0),
                removeFiles: vi.fn(),
            };
            expose(api);
            return {};
        },
    },
}));

// Silence CSS import errors in jsdom
vi.mock("filepond/dist/filepond.min.css", () => ({}), { virtual: true });
vi.mock(
    "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css",
    () => ({}),
    { virtual: true }
);

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
        reset: vi.fn(),
    });

    const book = {
        id: 1,
        title: "Test Book",
        author: "Test Author",
    };

    const createFile = (
        name = "test.jpg",
        type = "image/jpeg",
        size = 1024
    ) => {
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
                search: null,
            },
        });

        // Mock localStorage
        Object.defineProperty(window, "localStorage", {
            value: {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
            },
            writable: true,
        });

        // Mock DOM methods for CSRF token
        global.document.querySelector = vi.fn((selector) => {
            if (selector === 'meta[name="csrf-token"]') {
                return { getAttribute: () => "mock-csrf-token" };
            }
            return null;
        });

        // Mock fetch for submissions
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                text: () => Promise.resolve("success"),
                json: () => Promise.resolve({}),
            })
        );

        wrapper = mount(NewPageForm, {
            props: { book },
            global: {
                mocks: {
                    $page: {
                        props: {
                            settings: { youtube_enabled: true },
                        },
                    },
                },
            },
        });
    });

    describe("Component Rendering", () => {
        it("renders the form title", () => {
            expect(wrapper.text()).toContain("Add New Page");
        });

        it("renders media type selection buttons when YouTube is enabled", () => {
            const buttons = wrapper.findAllComponents({ name: "Button" });
            const uploadButton = buttons.find((btn) =>
                btn.text().includes("Upload")
            );
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
                    search: null,
                },
            });

            wrapper = mount(NewPageForm, {
                props: { book },
                global: {
                    mocks: {
                        $page: {
                            props: {
                                settings: { youtube_enabled: false },
                            },
                        },
                    },
                },
            });

            await nextTick();

            const buttons = wrapper.findAllComponents({ name: "Button" });
            const youtubeButton = buttons.find((btn) =>
                btn.text().includes("YouTube")
            );

            expect(youtubeButton).toBeUndefined();
        });

        it("renders the content editor", () => {
            expect(wrapper.findComponent({ name: "Wysiwyg" }).exists()).toBe(
                true
            );
        });

        it("renders the FilePond uploader in upload mode", () => {
            expect(
                wrapper.findComponent({ name: "FilePondUploader" }).exists()
            ).toBe(true);
        });

        it("renders the create page button", () => {
            const buttons = wrapper.findAllComponents({ name: "Button" });
            const createButton = buttons.find((btn) =>
                btn.text().includes("Create Page!")
            );
            expect(createButton.exists()).toBe(true);
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
            const largeFile = createFile("test.jpg", "image/jpeg", 600000000); // 600MB (over 512MB limit)

            expect(validateFile(smallFile).valid).toBe(true);
            expect(validateFile(largeFile).valid).toBe(false);
            expect(validateFile(largeFile).sizeError).toBe(true);
        });

        it("calls FilePond process when files are queued and submit clicked", async () => {
            // Wait for FilePondUploader to mount
            await nextTick();
            // Simulate files are queued
            if (
                !wrapper.vm.pondQueueCount ||
                typeof wrapper.vm.pondQueueCount !== "object" ||
                !("value" in wrapper.vm.pondQueueCount)
            ) {
                wrapper.vm.pondQueueCount = ref(1);
            } else {
                wrapper.vm.pondQueueCount.value = 1;
            }
            await nextTick();

            await wrapper.vm.handleFormSubmit();

            // Simulate upload completion
            const pond = wrapper.findComponent({ name: "FilePondUploader" });
            pond.vm.$emit("all-done");
            await nextTick();
            // Assert the form closes
            expect(wrapper.emitted("close-form")).toBeTruthy();
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

            expect(
                wrapper.findComponent({ name: "VideoWrapper" }).exists()
            ).toBe(true);
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
                timestamp: Date.now(),
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
                timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
            };

            localStorage.getItem.mockReturnValue(
                JSON.stringify(expiredDraftData)
            );

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
        it("submits YouTube link using Inertia form", async () => {
            const component = wrapper.vm;
            component.mediaOption = "link";
            component.form.video_link = "https://youtube.com/watch?v=abc123";

            // Mock Inertia form post method
            mockForm.post = vi.fn((url, options) => {
                // Simulate successful submission
                if (options && options.onSuccess) {
                    options.onSuccess();
                }
            });

            await component.handleFormSubmit();

            expect(mockForm.post).toHaveBeenCalledWith(
                "/pages.store",
                expect.objectContaining({
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: expect.any(Function),
                    onError: expect.any(Function),
                })
            );
        });

        it("emits close-form after successful text-only submission", async () => {
            const component = wrapper.vm;
            component.form.content = "Test content";
            component.mediaOption = "link"; // so no queued files path

            // Mock Inertia form post method
            mockForm.post = vi.fn((url, options) => {
                // Simulate successful submission
                if (options && options.onSuccess) {
                    options.onSuccess();
                }
            });

            await component.handleFormSubmit();

            expect(wrapper.emitted("close-form")).toBeTruthy();
        });

        it("disables submit button when form is processing", async () => {
            // Set form to processing state and remount to ensure reactivity
            mockForm.processing = true;
            useForm.mockReturnValue(mockForm);

            // Remount wrapper with processing form
            wrapper = mount(NewPageForm, {
                props: { book },
                global: {
                    mocks: {
                        $page: {
                            props: {
                                settings: { youtube_enabled: true },
                            },
                        },
                    },
                },
            });

            await nextTick();

            const buttons = wrapper.findAllComponents({ name: "Button" });
            const createButton = buttons.find((btn) =>
                btn.text().includes("Create Page!")
            );

            expect(createButton.props("disabled")).toBe(true);
        });

        it("disables submit button when uploading", async () => {
            const component = wrapper.vm;
            component.isUploading = true;

            await nextTick();

            const buttons = wrapper.findAllComponents({ name: "Button" });
            const createButton = buttons.find((btn) =>
                btn.text().includes("Uploading...")
            );

            expect(createButton).toBeDefined();
            expect(createButton.props("disabled")).toBe(true);
        });

        it("enables submit button when not processing and not uploading", async () => {
            // Ensure both states are false
            mockForm.processing = false;
            const component = wrapper.vm;
            component.isUploading = false;

            await nextTick();

            const buttons = wrapper.findAllComponents({ name: "Button" });
            const createButton = buttons.find((btn) =>
                btn.text().includes("Create Page!")
            );

            expect(createButton.props("disabled")).toBe(false);
        });
    });
});
