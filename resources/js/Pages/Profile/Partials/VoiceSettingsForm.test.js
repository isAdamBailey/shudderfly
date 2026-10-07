import LanguageSelect from "@/Components/LanguageSelect.vue";
import VoiceSettingsForm from "@/Pages/Profile/Partials/VoiceSettingsForm.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive, ref } from "vue";

global.route = vi.fn((name) => `/${name.replace(/\./g, "/")}`);

const mockPatch = vi.fn();

// Reactive, so a locale change reaches the form's voice list.
const pageProps = reactive({
    locale: null,
    aiVoice: null,
    auth: { user: { id: 1, name: "Alice", locale: "" } },
});

vi.mock("@inertiajs/vue3", () => ({
    router: {
        patch: (...args) => mockPatch(...args),
    },
    usePage: () => ({ props: pageProps }),
}));

vi.mock("@/composables/aiVoice", async () =>
    (await import("@/composables/aiVoice.mock")).createAiVoiceMock(() =>
        Boolean(pageProps.aiVoice)
    )
);

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        // One voice has a label; the rest show their id.
        t: (key) =>
            key === "speech.ai_voice.am_puck" ? "Puck (playful)" : key,
    }),
}));

vi.mock("@/composables/permissions", () => ({
    usePermissions: () => ({
        canEditPages: { value: false },
    }),
}));

let speech;

function createSpeechApi() {
    return {
        voices: ref([]),
        selectedVoice: ref(null),
        setVoice: vi.fn(),
        emotionLabel: (emotion) => `emotion:${emotion || "normal"}`,
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
    };
}

vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => speech,
}));

const AI_VOICES = {
    en: ["af_heart", "am_puck"],
    es: ["ef_dora", "em_alex", "em_santa"],
    fr: ["ff_siwis"],
};

const DEVICE_VOICES = [
    { name: "Alex", lang: "en-US" },
    { name: "Daniel", lang: "en-GB" },
    { name: "Monica", lang: "es-ES" },
    { name: "Thomas", lang: "fr-FR" },
];

beforeEach(() => {
    speech = createSpeechApi();
    pageProps.locale = null;
    pageProps.aiVoice = null;
    pageProps.auth.user.locale = "";
});

describe("VoiceSettingsForm app language selector", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
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
        pageProps.auth.user.locale = "es";
        const wrapper = mount(VoiceSettingsForm);

        expect(findLanguageSelect(wrapper).props("modelValue")).toBe("es");
    });

    it("defaults to Automatic when the user has no stored locale", () => {
        pageProps.auth.user.locale = null;
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
        pageProps.auth.user.locale = "en";
        const wrapper = mount(VoiceSettingsForm);

        await openAndChoose(wrapper, "locale.automatic");

        expect(mockPatch).toHaveBeenCalledWith(
            "/profile/locale/preference",
            { locale: null },
            expect.objectContaining({ preserveScroll: true })
        );
    });
});

describe("VoiceSettingsForm voices", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        pageProps.locale = "en";
    });

    const voiceIds = (wrapper) =>
        wrapper.findAll('input[name="voice"]').map((input) => input.element.id);

    const voiceLabels = (wrapper) =>
        wrapper
            .findAll('input[name="voice"]')
            .map((input) => input.element.parentElement.textContent.trim());

    describe("with the AI voice on", () => {
        beforeEach(() => {
            pageProps.aiVoice = { voices: AI_VOICES };
            speech.voices.value = DEVICE_VOICES;
        });

        it("offers only the AI voices for the app locale, with friendly labels", () => {
            const wrapper = mount(VoiceSettingsForm);

            expect(voiceIds(wrapper)).toEqual([
                "ai-voice-af_heart",
                "ai-voice-am_puck",
            ]);
            expect(voiceLabels(wrapper)).toEqual([
                "af_heart",
                "Puck (playful)",
            ]);
            expect(wrapper.find("select").exists()).toBe(false);
        });

        it("switches the list when the app language changes", async () => {
            const wrapper = mount(VoiceSettingsForm);

            pageProps.locale = "es";
            await nextTick();

            expect(voiceIds(wrapper)).toEqual([
                "ai-voice-ef_dora",
                "ai-voice-em_alex",
                "ai-voice-em_santa",
            ]);
        });

        it("checks the saved voice and saves a new pick for the locale", async () => {
            localStorage.setItem("aiVoice.en", "am_puck");
            const wrapper = mount(VoiceSettingsForm);

            expect(wrapper.find("#ai-voice-am_puck").element.checked).toBe(
                true
            );

            await wrapper.find("#ai-voice-af_heart").setValue(true);

            expect(localStorage.getItem("aiVoice.en")).toBe("af_heart");
            expect(localStorage.getItem("aiVoice.es")).toBeNull();
            expect(speech.speak).toHaveBeenCalledWith("speech.voice_changed");
            expect(wrapper.find("#ai-voice-af_heart").element.checked).toBe(
                true
            );
        });

        it("checks the default once the voice list arrives", async () => {
            pageProps.aiVoice = null;
            const wrapper = mount(VoiceSettingsForm);

            pageProps.aiVoice = { voices: AI_VOICES };
            await nextTick();

            expect(wrapper.find("#ai-voice-af_heart").element.checked).toBe(
                true
            );
        });

        it("checks the default when the saved voice isn't allowed", () => {
            localStorage.setItem("aiVoice.en", "ff_siwis");
            const wrapper = mount(VoiceSettingsForm);

            expect(wrapper.find("#ai-voice-af_heart").element.checked).toBe(
                true
            );
        });

        it("doesn't switch or announce a device voice on Normal", async () => {
            speech.selectedEmotion.value = "excited";
            mount(VoiceSettingsForm);

            speech.selectedEmotion.value = "";
            await nextTick();

            expect(speech.setVoice).not.toHaveBeenCalled();
        });

        it("disables the voices while speaking", () => {
            speech.speaking.value = true;
            const wrapper = mount(VoiceSettingsForm);

            expect(
                wrapper
                    .findAll('input[name="voice"]')
                    .every((input) => input.element.disabled)
            ).toBe(true);
        });

        it("previews a voice with the sample line", async () => {
            const wrapper = mount(VoiceSettingsForm);

            await wrapper
                .findAll('[data-test="preview-voice"]')[1]
                .trigger("click");

            expect(speech.speak).toHaveBeenCalledWith(
                "speech.voice_sample",
                null,
                { aiVoice: "am_puck" }
            );
        });
    });

    describe("with the AI voice off", () => {
        beforeEach(() => {
            speech.voices.value = DEVICE_VOICES;
        });

        it("offers the device voices for the app locale, with no language dropdown", async () => {
            const wrapper = mount(VoiceSettingsForm);

            expect(voiceLabels(wrapper)).toEqual(["Alex", "Daniel"]);
            expect(wrapper.find("select").exists()).toBe(false);

            pageProps.locale = "fr";
            await nextTick();

            expect(voiceLabels(wrapper)).toEqual(["Thomas"]);
        });

        it("offers every voice when the device has none for the locale", () => {
            speech.voices.value = DEVICE_VOICES.filter((v) =>
                v.lang.startsWith("en")
            );
            pageProps.locale = "fr";
            const wrapper = mount(VoiceSettingsForm);

            expect(voiceLabels(wrapper)).toEqual(["Alex", "Daniel"]);
        });

        it("checks the voice in use and picks another", async () => {
            speech.selectedVoice.value = DEVICE_VOICES[1];
            const wrapper = mount(VoiceSettingsForm);

            expect(wrapper.find("#device-voice-1").element.checked).toBe(true);

            await wrapper.find("#device-voice-0").setValue(true);

            expect(speech.setVoice).toHaveBeenCalledWith(DEVICE_VOICES[0]);
        });

        it("previews a device voice with the sample line", async () => {
            const wrapper = mount(VoiceSettingsForm);

            await wrapper.find('[data-test="preview-voice"]').trigger("click");

            expect(speech.speak).toHaveBeenCalledWith(
                "speech.voice_sample",
                null,
                { deviceVoice: DEVICE_VOICES[0] }
            );
        });
    });

    it("labels the emotion presets in the app language", () => {
        const wrapper = mount(VoiceSettingsForm);

        expect(wrapper.find('[data-emotion="hyper"]').text()).toBe(
            "emotion:hyper"
        );
    });
});
