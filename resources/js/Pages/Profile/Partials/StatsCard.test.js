import SpeakButton from "@/Components/SpeakButton.vue";
import StatsCard from "@/Pages/Profile/Partials/StatsCard.vue";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

global.route = vi.fn((name, param) => `/${name.replace(/\./g, "/")}/${param}`);

const mockSpeak = vi.fn();

vi.mock("@inertiajs/vue3", () => ({
    Link: {
        props: ["href"],
        template: "<a :href='href'><slot /></a>",
    },
}));

vi.mock("@/composables/useMusicPlayer", () => ({
    useMusicPlayer: () => ({
        playSong: vi.fn(),
        openFlyout: vi.fn(),
        setFilter: vi.fn(),
    }),
}));

vi.mock("@/composables/useSpeechSynthesis", () => ({
    useSpeechSynthesis: () => ({
        speak: (...args) => mockSpeak(...args),
        speaking: ref(false),
    }),
}));

// Mirror the real t(): look the key up, fall back to the key itself, then
// substitute :placeholder tokens.
const translations = {
    "stats.most_reacted_message":
        "Most reacted message: :text. :count reactions, by :user.",
    "stats.most_reacted_message_anon":
        "Most reacted message: :text. :count reactions.",
    "stats.most_reacted_comment":
        "Most reacted comment: :text. :count reactions, by :user.",
    "stats.most_active_commenter":
        "Most active commenter in the last thirty days: :user, with :count comments.",
    "stats.most_active_poster":
        "Most active poster in the last thirty days: :user, with :count messages.",
    "stats.busiest_upload_day":
        "Busiest upload day: :day, with :count uploads.",
    "stats.busiest_message_day":
        "Busiest message day: :day, with :count messages.",
    "stats.day.tuesday": "Tuesday",
    "stats.day.friday": "Friday",
};

vi.mock("@/composables/useTranslations", () => ({
    useTranslations: () => ({
        t: (key, replacements = {}) => {
            let phrase = translations[key] ?? key;
            Object.entries(replacements).forEach(([token, value]) => {
                phrase = phrase.replace(new RegExp(`:${token}`, "g"), value);
            });
            return phrase;
        },
    }),
}));

const stats = {
    generatedAt: "2026-08-10 09:00",
    numberOfBooks: 12,
    numberOfPages: 3400,
    numberOfSongs: 20,
    numberOfSounds: 5,
    numberOfImages: 2000,
    numberOfVideos: 300,
    numberOfYouTubeVideos: 40,
    numberOfScreenshots: 60,
    mostPages: { title: "Big Book", slug: "big-book", pages_count: 90 },
    leastPages: { title: "Small Book", slug: "small-book", pages_count: 2 },
    mostReadBooks: [{ id: 1, title: "Big Book", slug: "big-book" }],
    mostReadSongs: [{ id: 1, title: "A Song" }],
    mostReactedMessage: {
        text: "Hello there",
        reactions_count: 7,
        user: { name: "Alice" },
        created_at: "2026-08-01T00:00:00Z",
    },
    mostReactedComment: {
        text: "Nice one",
        reactions_count: 4,
        user: { name: "Bob" },
        created_at: "2026-08-02T00:00:00Z",
    },
    mostActiveCommenterLast30Days: { user: { name: "Carol" }, count: 33 },
    mostActiveMessengerLast30Days: { user: { name: "Dave" }, count: 41 },
    busiestUploadDayOfWeek: { day: "Tuesday", count: 1200 },
    busiestMessageDayOfWeek: { day: "Friday", count: 88 },
};

const mountCard = (overrides = {}) =>
    mount(StatsCard, { props: { stats: { ...stats, ...overrides } } });

const clickByLabel = async (wrapper, label) => {
    const button = wrapper
        .findAllComponents(SpeakButton)
        .find((b) => b.props("ariaLabel") === label);

    expect(button, `no SpeakButton labelled "${label}"`).toBeTruthy();
    await button.find("button").trigger("click");
};

describe("StatsCard speech", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders a speak button for every tile", () => {
        // 8 counters + most/least pages + 2 top lists + 6 engagement tiles
        expect(mountCard().findAllComponents(SpeakButton)).toHaveLength(18);
    });

    it.each([
        [
            "Speak most reacted message",
            "Most reacted message: Hello there. 7 reactions, by Alice.",
        ],
        [
            "Speak most reacted comment",
            "Most reacted comment: Nice one. 4 reactions, by Bob.",
        ],
        [
            "Speak most active commenter",
            "Most active commenter in the last thirty days: Carol, with 33 comments.",
        ],
        [
            "Speak most active poster",
            "Most active poster in the last thirty days: Dave, with 41 messages.",
        ],
        [
            "Speak busiest upload day",
            "Busiest upload day: Tuesday, with 1,200 uploads.",
        ],
        [
            "Speak busiest message day",
            "Busiest message day: Friday, with 88 messages.",
        ],
    ])("speaks the %s tile", async (label, phrase) => {
        await clickByLabel(mountCard(), label);

        expect(mockSpeak).toHaveBeenCalledTimes(1);
        expect(mockSpeak).toHaveBeenCalledWith(phrase);
    });

    it("drops the author clause when a reacted message has no user", async () => {
        const wrapper = mountCard({
            mostReactedMessage: { text: "Hello there", reactions_count: 7 },
        });

        await clickByLabel(wrapper, "Speak most reacted message");

        expect(mockSpeak).toHaveBeenCalledWith(
            "Most reacted message: Hello there. 7 reactions."
        );
    });

    it("falls back to the raw day name when it has no translation", async () => {
        const wrapper = mountCard({
            busiestUploadDayOfWeek: { day: "Sunday", count: 3 },
        });

        await clickByLabel(wrapper, "Speak busiest upload day");

        expect(mockSpeak).toHaveBeenCalledWith(
            "Busiest upload day: Sunday, with 3 uploads."
        );
    });
});
