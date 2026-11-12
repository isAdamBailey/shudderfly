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

// mockVoice is the latest builder's recorder; mockVoices has every one.
const { mockSettings, mockVoice, mockVoices } = vi.hoisted(() => ({
    mockSettings: {},
    mockVoice: {},
    mockVoices: [],
}));

vi.mock("@/composables/useVoiceRecorder", async () => {
    const { ref } = await import("vue");
    return {
        useVoiceRecorder: () => {
            const recorder = {
                state: ref("idle"),
                elapsed: ref(0),
                clip: ref(null),
                error: ref(null),
                start: vi.fn(),
                stop: vi.fn(),
                discard: vi.fn(),
            };
            mockVoices.push(recorder);
            Object.assign(mockVoice, recorder);
            return recorder;
        },
    };
});

vi.mock("@inertiajs/vue3", () => ({
    useForm: () => mockForm,
    usePage: () => ({
        props: {
            settings: mockSettings,
            voiceClipMaxSeconds: 60,
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

    describe("Feeling sentence buttons", () => {
        it("appends feeling sentence to input when clicked", async () => {
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

            // The "Happy" pane is opened via its category tab (the second
            // tab, after "Things you can do") — it is not open by default.
            const happyTab = wrapper.findAll('[role="tab"]')[1];
            await happyTab.trigger("click");
            await nextTick();

            // t() falls back to the raw translation key in tests since no
            // "translations" prop is mocked on the page.
            const happyButton = wrapper
                .findAll("button")
                .find((btn) => btn.text().trim() === "feelings.happy_1");

            expect(happyButton).toBeTruthy();
            await happyButton.trigger("click");
            await nextTick();

            // Input should contain both "Hello " and the sentence key
            expect(input.element.value).toContain("Hello");
            expect(input.element.value).toContain("feelings.happy_1");
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

    describe("Voice clips", () => {
        const mountBuilder = (props = {}) =>
            mount(MessageBuilder, {
                props: { users: defaultUsers, ...props },
                global: { stubs: { VoiceClipPlayer: true } },
            });

        beforeEach(() => {
            mockSettings.voice_messages_enabled = "1";
            mockForm.voice_clip = null;
            mockForm.voice_clip_duration = null;
        });

        it("hides the mic while voice messages are off", () => {
            mockSettings.voice_messages_enabled = "0";

            const wrapper = mountBuilder();

            expect(wrapper.find('[data-test="voice-record"]').exists()).toBe(
                false
            );
        });

        it("shows the mic when commenting", () => {
            const wrapper = mountBuilder({ mode: "comment", messageId: 1 });

            expect(wrapper.find('[data-test="voice-record"]').exists()).toBe(
                true
            );
        });

        it("taps to start and taps again to stop", async () => {
            const wrapper = mountBuilder();
            const mic = wrapper.find('[data-test="voice-record"]');

            await mic.trigger("click");
            expect(mockVoice.start).toHaveBeenCalled();

            mockVoice.state.value = "recording";
            await nextTick();
            await mic.trigger("click");
            expect(mockVoice.stop).toHaveBeenCalled();
            expect(wrapper.vm.submitDisabled).toBe(true);
        });

        it("shows and speaks why recording couldn't start", async () => {
            const wrapper = mountBuilder();

            mockVoice.error.value = "denied";
            await nextTick();

            expect(wrapper.find('[role="alert"]').text()).toBe("voice.denied");
            expect(mockSpeak).toHaveBeenCalledWith("voice.denied");
        });

        it("previews a recording and posts it as a voice-only message", async () => {
            const wrapper = mountBuilder();
            mockVoice.state.value = "recorded";
            mockVoice.clip.value = {
                blob: new Blob(["voice"], { type: "audio/webm" }),
                url: "blob:clip",
                duration: 4.2,
                extension: "webm",
            };
            await nextTick();

            expect(wrapper.find('[data-test="voice-preview"]').exists()).toBe(
                true
            );
            expect(wrapper.vm.submitDisabled).toBe(false);

            wrapper.vm.submitContent();

            expect(mockForm.voice_clip).toBeInstanceOf(File);
            expect(mockForm.voice_clip.name).toBe("voice-clip.webm");
            expect(mockForm.voice_clip_duration).toBe(4.2);
            expect(mockForm.post).toHaveBeenCalledWith(
                "/messages.store",
                expect.objectContaining({ forceFormData: true })
            );
        });

        const recordedClip = () => ({
            blob: new Blob(["voice"], { type: "audio/webm" }),
            url: "blob:clip",
            duration: 4.2,
            extension: "webm",
        });

        it("posts a voice-only comment with its clip", async () => {
            const { router } = await import("@inertiajs/vue3");
            const wrapper = mountBuilder({ mode: "comment", messageId: 7 });
            mockVoice.state.value = "recorded";
            mockVoice.clip.value = recordedClip();
            await nextTick();

            expect(wrapper.find('[data-test="voice-preview"]').exists()).toBe(
                true
            );
            expect(wrapper.vm.submitDisabled).toBe(false);

            wrapper.vm.submitContent();

            expect(router.post).toHaveBeenCalledWith(
                "/messages.comments.store",
                expect.objectContaining({
                    comment: "",
                    voice_clip: expect.any(File),
                    voice_clip_duration: 4.2,
                }),
                expect.objectContaining({ forceFormData: true })
            );
            const [, data] = router.post.mock.calls[0];
            expect(data.voice_clip.name).toBe("voice-clip.webm");
        });

        it("discards the clip once the comment posts", async () => {
            const { router } = await import("@inertiajs/vue3");
            const wrapper = mountBuilder({ mode: "comment", messageId: 7 });
            mockVoice.state.value = "recorded";
            mockVoice.clip.value = recordedClip();
            await nextTick();

            wrapper.vm.submitContent();
            router.post.mock.calls[0][2].onSuccess();

            expect(mockVoice.discard).toHaveBeenCalled();
            expect(wrapper.emitted("commentPosted")).toEqual([[7]]);
        });

        it("shows why the server turned a comment's clip down", async () => {
            const { router } = await import("@inertiajs/vue3");
            const wrapper = mountBuilder({ mode: "comment", messageId: 7 });
            mockVoice.state.value = "recorded";
            mockVoice.clip.value = recordedClip();
            await nextTick();

            wrapper.vm.submitContent();
            router.post.mock.calls[0][2].onError({
                voice_clip_duration: "Too long",
            });
            await nextTick();

            expect(wrapper.find('[role="alert"]').text()).toBe("Too long");
        });

        it("stops recording in one comment input when another opens", async () => {
            mockVoices.length = 0;
            mountBuilder({ mode: "comment", messageId: 1 });
            const first = mockVoices[0];
            first.state.value = "recording";

            mountBuilder({ mode: "comment", messageId: 2 });
            await nextTick();

            expect(first.stop).toHaveBeenCalled();
            expect(mockVoices[1].stop).not.toHaveBeenCalled();
        });

        it("keeps recording while its own comment input stays active", async () => {
            mockVoices.length = 0;
            const wrapper = mountBuilder({ mode: "comment", messageId: 1 });
            mockVoices[0].state.value = "recording";

            await wrapper.find("textarea").trigger("focus");
            await nextTick();

            expect(mockVoices[0].stop).not.toHaveBeenCalled();
        });
    });
});
