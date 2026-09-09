import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";

vi.mock("@inertiajs/vue3", () => ({
    usePage: () => ({
        props: {
            locale: "en",
            translations: {},
        },
    }),
}));

function mountSpeech() {
    let api;
    const wrapper = mount(
        defineComponent({
            setup() {
                api = useSpeechSynthesis();
                return () => null;
            },
        })
    );
    return { api, wrapper };
}

describe("useSpeechSynthesis", () => {
    let wrapper;

    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        window.speechSynthesis.paused = false;
        window.speechSynthesis.speak.mockClear();
        window.speechSynthesis.resume.mockClear();
        window.speechSynthesis.getVoices.mockReturnValue([
            { name: "Test Voice", lang: "en-US" },
        ]);
    });

    afterEach(() => {
        wrapper?.unmount();
        vi.useRealTimers();
    });

    it("speaks with the system default voice when getVoices is empty", () => {
        window.speechSynthesis.getVoices.mockReturnValue([]);
        const mounted = mountSpeech();
        wrapper = mounted.wrapper;

        mounted.api.speak("hello there");

        expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });

    it("does not speak when the phrase is empty", () => {
        const mounted = mountSpeech();
        wrapper = mounted.wrapper;

        mounted.api.speak("");

        expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
    });
});
