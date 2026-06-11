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

    const findAppLanguageSelect = (wrapper) => {
        const labels = wrapper.findAll("label");
        const label = labels.find((l) => l.text() === "locale.app_language");
        return label.element.nextElementSibling;
    };

    it("renders Automatic, English, and Español options", () => {
        const wrapper = mount(VoiceSettingsForm);

        const select = findAppLanguageSelect(wrapper);
        const options = Array.from(select.querySelectorAll("option")).map(
            (o) => ({ value: o.value, text: o.textContent })
        );

        expect(options).toEqual([
            { value: "", text: "locale.automatic" },
            { value: "en", text: "locale.english" },
            { value: "es", text: "locale.spanish" },
        ]);
    });

    it("pre-selects the option based on the user's stored locale", () => {
        mockUserLocale = "es";
        const wrapper = mount(VoiceSettingsForm);

        const select = findAppLanguageSelect(wrapper);
        expect(select.value).toBe("es");
    });

    it("defaults to Automatic when the user has no stored locale", () => {
        mockUserLocale = null;
        const wrapper = mount(VoiceSettingsForm);

        const select = findAppLanguageSelect(wrapper);
        expect(select.value).toBe("");
    });

    it("sends the selected locale to the backend", async () => {
        const wrapper = mount(VoiceSettingsForm);

        const select = findAppLanguageSelect(wrapper);
        select.value = "es";
        select.dispatchEvent(new Event("change"));
        await wrapper.vm.$nextTick();

        expect(mockPatch).toHaveBeenCalledWith(
            "/profile/locale/preference",
            { locale: "es" },
            expect.objectContaining({ preserveScroll: true })
        );
    });

    it("sends null when Automatic is selected", async () => {
        mockUserLocale = "en";
        const wrapper = mount(VoiceSettingsForm);

        const select = findAppLanguageSelect(wrapper);
        select.value = "";
        select.dispatchEvent(new Event("change"));
        await wrapper.vm.$nextTick();

        expect(mockPatch).toHaveBeenCalledWith(
            "/profile/locale/preference",
            { locale: null },
            expect.objectContaining({ preserveScroll: true })
        );
    });
});
