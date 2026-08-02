import { usePage } from "@inertiajs/vue3";

export const APP_LOCALE_STORAGE_KEY = "appLocale";
export const ENGLISH_SPEECH_LANGS = ["en-US", "en-GB", "en-AU", "en-CA", "en"];
export const SPANISH_SPEECH_LANGS = ["es-ES", "es-MX", "es-US", "es"];
export const FRENCH_SPEECH_LANGS = ["fr-FR", "fr-CA", "fr-CH", "fr-BE", "fr"];

export const DEFAULT_APP_LOCALE = "en";

// Every app locale maps to the speech language it defaults to and the ordered
// list of BCP 47 codes we hunt through when picking a matching browser voice.
export const APP_LOCALES = {
    en: { speechLang: "en-US", speechLangs: ENGLISH_SPEECH_LANGS },
    es: { speechLang: "es-ES", speechLangs: SPANISH_SPEECH_LANGS },
    fr: { speechLang: "fr-FR", speechLangs: FRENCH_SPEECH_LANGS },
};

export const SUPPORTED_APP_LOCALES = Object.keys(APP_LOCALES);

export function normalizeAppLocale(locale) {
    return Object.prototype.hasOwnProperty.call(APP_LOCALES, locale)
        ? locale
        : DEFAULT_APP_LOCALE;
}

export function persistAppLocale(locale) {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, normalizeAppLocale(locale));
}

export function getStoredAppLocale() {
    return normalizeAppLocale(localStorage.getItem(APP_LOCALE_STORAGE_KEY));
}

export function getAppLocaleFromPage(page) {
    if (page?.props?.locale) {
        return normalizeAppLocale(page.props.locale);
    }

    if (page?.props?.auth?.user?.locale) {
        return normalizeAppLocale(page.props.auth.user.locale);
    }

    return getStoredAppLocale();
}

export function syncAppLocaleFromPage(page) {
    const locale = getAppLocaleFromPage(page);
    persistAppLocale(locale);
    return locale;
}

export function resolveSpeechLanguageForAppLocale(appLocale) {
    return APP_LOCALES[normalizeAppLocale(appLocale)].speechLang;
}

export function preferredSpeechLangCodes(appLocale) {
    return APP_LOCALES[normalizeAppLocale(appLocale)].speechLangs;
}

export function voiceMatchesAppLocale(voice, appLocale) {
    if (!voice?.lang) {
        return false;
    }

    return voice.lang.toLowerCase().startsWith(normalizeAppLocale(appLocale));
}

function findVoiceByLangCodes(voices, langCodes) {
    for (const code of langCodes) {
        const match = voices.find(
            (voice) =>
                voice.lang === code ||
                voice.lang.toLowerCase().startsWith(`${code.toLowerCase()}-`)
        );
        if (match) {
            return match;
        }
    }

    return null;
}

export function resolveSpeechVoice(voices, appLocale) {
    if (!voices?.length) {
        return null;
    }

    const normalizedLocale = normalizeAppLocale(appLocale);
    const storedIndex = parseInt(
        localStorage.getItem("selectedVoiceIndex") || "0",
        10
    );
    const storedVoice = voices[storedIndex];

    if (storedVoice && voiceMatchesAppLocale(storedVoice, normalizedLocale)) {
        return storedVoice;
    }

    const preferredMatch = findVoiceByLangCodes(
        voices,
        preferredSpeechLangCodes(normalizedLocale)
    );
    if (preferredMatch) {
        return preferredMatch;
    }

    return (
        voices.find((voice) =>
            voice.lang.toLowerCase().startsWith(normalizedLocale)
        ) ||
        storedVoice ||
        voices[0]
    );
}

export function syncStoredSpeechLanguage(voices, appLocale) {
    const normalizedLocale = normalizeAppLocale(appLocale);
    const speechLang = resolveSpeechLanguageForAppLocale(normalizedLocale);
    localStorage.setItem("selectedLanguage", speechLang);

    const voice = resolveSpeechVoice(voices, normalizedLocale);
    if (voice) {
        const index = voices.findIndex(
            (candidate) =>
                candidate.name === voice.name && candidate.lang === voice.lang
        );
        if (index !== -1) {
            localStorage.setItem("selectedVoiceIndex", index.toString());
        }
    }

    return { speechLang, voice };
}

export function applySpeechSettingsToUtterance(utterance, voices, appLocale) {
    utterance.rate = parseFloat(localStorage.getItem("speechRate") || "1");
    utterance.pitch = parseFloat(localStorage.getItem("speechPitch") || "1");
    utterance.volume = parseFloat(localStorage.getItem("speechVolume") || "1");

    const voice = resolveSpeechVoice(voices, appLocale);
    if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
    }
}
