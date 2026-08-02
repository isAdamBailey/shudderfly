import LanguageSelect from "@/Components/LanguageSelect.vue";
import VoiceSettingsForm from "@/Pages/Profile/Partials/VoiceSettingsForm.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

global.route = vi.fn((name) => `/${name.replace(/\./g, "/")}`);

const mockPatch = vi.fn();
let mockUserLocale = "";

vi.mock("@inertiajs/vue3", () => ({
    router: {
        patch: (...args) => mockPatch(...args),
    },
    usePage: () => ({
        props: {
            auth: { user: { id: 1, name: "Alice", locale: mockUserLocale } },
        },
    }),
}));

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        t: (key) => key,
    }),
}));

vi.mock("@/composables/permissions", () => ({
    usePermissions: () => ({
        canEditPages: { value: false },
    }),
}));

vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({
        voices: ref([]),
        selectedVoice: ref(null),
        setVoice: vi.fn(),
        speechRate: ref(1),
        speechPitch: ref(1),
        speechVolume: ref(1),
        selectedEmotion: ref(""),
        speaking: ref(false),
        setSpeechRateSilent: vi.fn(),
        setSpeechPitchSilent: vi.fn(),
        setSpeechVolumeSilent: vi.fn(),
        setSelectedEmotion: vi.fn(),
        speak: vi.fn(),
    }),
}));

describe("VoiceSettingsForm app language selector", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockUserLocale = "";
    });

    const findLanguageSelect = (wrapper) =>
        wrapper.findComponent(LanguageSelect);

    const openAndChoose = async (wrapper, label) => {
        const select = findLanguageSelect(wrapper);
        await select.find("button").trigger("click");

        const option = select
            .findAll('[role="option"]')
            .find((o) => o.text().includes(label));
        await option.trigger("click");
    };

    it("offers Automatic, English, Español, and Français", () => {
        const wrapper = mount(VoiceSettingsForm);

        expect(findLanguageSelect(wrapper).props("options")).toEqual([
            { value: "", label: "locale.automatic", flag: "🌐" },
            { value: "en", label: "locale.english", flag: "🇺🇸" },
            { value: "es", label: "locale.spanish", flag: "🇪🇸" },
            { value: "fr", label: "locale.french", flag: "🇫🇷" },
        ]);
    });

    it("pre-selects the option based on the user's stored locale", () => {
        mockUserLocale = "es";
        const wrapper = mount(VoiceSettingsForm);

        expect(findLanguageSelect(wrapper).props("modelValue")).toBe("es");
    });

    it("defaults to Automatic when the user has no stored locale", () => {
        mockUserLocale = null;
        const wrapper = mount(VoiceSettingsForm);

        expect(findLanguageSelect(wrapper).props("modelValue")).toBe("");
    });

    it("sends the selected locale to the backend", async () => {
        const wrapper = mount(VoiceSettingsForm);

        await openAndChoose(wrapper, "locale.spanish");

        expect(mockPatch).toHaveBeenCalledWith(
            "/profile/locale/preference",
            { locale: "es" },
            expect.objectContaining({ preserveScroll: true })
        );
    });

    it("sends French when Français is selected", async () => {
        const wrapper = mount(VoiceSettingsForm);

        await openAndChoose(wrapper, "locale.french");

        expect(mockPatch).toHaveBeenCalledWith(
            "/profile/locale/preference",
            { locale: "fr" },
            expect.objectContaining({ preserveScroll: true })
        );
    });

    it("sends null when Automatic is selected", async () => {
        mockUserLocale = "en";
        const wrapper = mount(VoiceSettingsForm);

        await openAndChoose(wrapper, "locale.automatic");

        expect(mockPatch).toHaveBeenCalledWith(
            "/profile/locale/preference",
            { locale: null },
            expect.objectContaining({ preserveScroll: true })
        );
    });
});
