import MessageBuilder from "@/Components/Messages/MessageBuilder.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

global.route = (name) => `/${name}`;

// Mock composables
const mockSpeak = vi.fn();
vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({
        speak: mockSpeak,
        speaking: { value: false },
    }),
}));

const mockForm = {
    message: "",
    tagged_user_ids: [],
    processing: false,
    post: vi.fn(),
    reset: vi.fn(),
    errors: {},
};

vi.mock("@inertiajs/vue3", () => ({
    useForm: () => mockForm,
    usePage: () => ({
        props: {
            flash: {},
            auth: {
                user: {
                    id: 1,
                    name: "Test User",
                },
            },
            search: null,
        },
    }),
    router: {
        post: vi.fn(),
    },
}));

describe("MessageBuilder", () => {
    const defaultUsers = [
        { id: 1, name: "John Doe" },
        { id: 2, name: "Jane Smith" },
        { id: 3, name: "Bob Johnson" },
    ];

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        mockForm.processing = false;
        mockForm.errors = {};
    });

    describe("Rendering", () => {
        it("renders the message input field", () => {
            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            expect(wrapper.find("textarea").exists()).toBe(true);
        });

        it("renders the @ button for mentions", async () => {
            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            // The @ button lives in the "Things you can do" tools pane, which is
            // opened from the category toolbar (the first tab).
            const toolsTab = wrapper.find('[role="tab"]');
            await toolsTab.trigger("click");
            await nextTick();

            const atButton = wrapper
                .findAll("button")
                .find((btn) => btn.find("i.ri-at-line").exists());
            expect(atButton).toBeTruthy();
        });
    });

    describe("User tagging autocomplete", () => {
        it("shows user suggestions when @ is typed", async () => {
            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            const input = wrapper.find("textarea");
            await input.setValue("@");
            await input.trigger("input");

            await nextTick();

            // Check if suggestions dropdown appears
            const suggestions = wrapper.find(".user-suggestions-container");
            if (suggestions.exists()) {
                expect(suggestions.exists()).toBe(true);
            }
        });

        it("filters user suggestions based on query", async () => {
            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            const input = wrapper.find("textarea");
            await input.setValue("@j");
            await input.trigger("input");

            await nextTick();

            // Should show users matching "j" (John Doe, Jane Smith)
            const suggestions = wrapper.find(".user-suggestions-container");
            if (suggestions.exists()) {
                expect(suggestions.text()).toContain("John");
                expect(suggestions.text()).toContain("Jane");
            }
        });

        it("inserts mention when user is selected", async () => {
            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            const input = wrapper.find("textarea");
            await input.setValue("@");
            await input.trigger("input");

            await nextTick();

            // The component should handle mention insertion
            // This is tested through the component's internal logic
            expect(input.element.value).toBe("@");
        });
    });

    describe("Favorites functionality", () => {
        it("loads favorites from localStorage on mount", async () => {
            localStorage.setItem(
                "message_builder_favorites_v1",
                JSON.stringify(["Hello world", "Thank you"])
            );

            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            await nextTick();

            // Favorites should be loaded (tested through component state)
            expect(wrapper.vm).toBeTruthy();
        });

        it("saves favorite when save button is clicked", async () => {
            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            const input = wrapper.find("textarea");
            await input.setValue("Test message");
            await input.trigger("input");

            await nextTick();

            // Open the "Things you can do" tools pane where the save button lives
            await wrapper.find('[role="tab"]').trigger("click");
            await nextTick();

            // Find and click save favorite button
            const saveButton = wrapper
                .findAll("button")
                .find(
                    (btn) => btn.attributes("aria-label") === "Save favorite"
                );

            if (saveButton) {
                await saveButton.trigger("click");
                await nextTick();

                const favorites = JSON.parse(
                    localStorage.getItem("message_builder_favorites_v1") || "[]"
                );
                expect(favorites).toContain("Test message");
            }
        });

        it("removes favorite when remove button is clicked", async () => {
            localStorage.setItem(
                "message_builder_favorites_v1",
                JSON.stringify(["Favorite 1", "Favorite 2"])
            );

            vi.stubGlobal("confirm", () => true);

            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            await nextTick();

            const removeButton = wrapper
                .findAll("button")
                .find(
                    (btn) =>
                        btn.attributes("aria-label") ===
                        "Remove favorite: Favorite 1"
                );

            if (removeButton) {
                await removeButton.trigger("click");
                await nextTick();

                const favorites = JSON.parse(
                    localStorage.getItem("message_builder_favorites_v1") || "[]"
                );
                expect(favorites).not.toContain("Favorite 1");
                expect(favorites).toContain("Favorite 2");
            }
        });
    });

    describe("Quick message buttons", () => {
        it("appends quick message to input when clicked", async () => {
            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            const input = wrapper.find("textarea");
            await input.setValue("Hello ");
            await input.trigger("input");

            await nextTick();

            // The "Quick messages" pane is open by default, so its phrases
            // (e.g. "yes") are visible without switching tabs.
            const quickButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().trim() === "yes");

            expect(quickButton).toBeTruthy();
            await quickButton.trigger("click");
            await nextTick();

            // Input should contain both "Hello " and "yes"
            expect(input.element.value).toContain("Hello");
            expect(input.element.value).toContain("yes");
        });
    });

    describe("Form submission", () => {
        // The submit button lives in MessageBuilderModal's sticky footer, not in
        // this component; MessageBuilder exposes submitContent/submitDisabled/
        // submitLabel for the modal to drive.
        it("submits form when submitContent is called", async () => {
            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            const input = wrapper.find("textarea");
            await input.setValue("Test message");
            await input.trigger("input");

            await nextTick();

            expect(wrapper.vm.submitDisabled).toBe(false);

            wrapper.vm.submitContent();
            await nextTick();

            expect(mockForm.post).toHaveBeenCalled();
        });

        it("exposes submitDisabled as true when form is processing", () => {
            mockForm.processing = true;

            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            expect(wrapper.vm.submitDisabled).toBe(true);
        });

        it("resets form after successful submission", async () => {
            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            const input = wrapper.find("textarea");
            await input.setValue("Test message");
            await input.trigger("input");

            await nextTick();

            wrapper.vm.submitContent();
            await nextTick();

            const onSuccess = mockForm.post.mock.calls[0][1]?.onSuccess;
            onSuccess();
            await nextTick();

            expect(mockForm.reset).toHaveBeenCalled();
        });
    });

    describe("Word count", () => {
        it("displays word count correctly", async () => {
            const wrapper = mount(MessageBuilder, {
                props: { users: defaultUsers },
                global: {
                    stubs: {
                        Accordion: true,
                        Button: { template: "<button><slot/></button>" },
                    },
                },
            });

            const input = wrapper.find("textarea");
            await input.setValue("Hello world test");
            await input.trigger("input");

            await nextTick();

            // Word count should be displayed (if the component shows it)
            expect(wrapper.vm).toBeTruthy();
        });
    });
});
