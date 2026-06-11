import { usePage } from "@inertiajs/vue3";

export const APP_LOCALE_STORAGE_KEY = "appLocale";
export const ENGLISH_SPEECH_LANGS = ["en-US", "en-GB", "en-AU", "en-CA", "en"];
export const SPANISH_SPEECH_LANGS = ["es-ES", "es-MX", "es-US", "es"];

export function normalizeAppLocale(locale) {
  return locale === "es" ? "es" : "en";
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
  return normalizeAppLocale(appLocale) === "es" ? "es-ES" : "en-US";
}

export function preferredSpeechLangCodes(appLocale) {
  return normalizeAppLocale(appLocale) === "es"
    ? SPANISH_SPEECH_LANGS
    : ENGLISH_SPEECH_LANGS;
}

export function voiceMatchesAppLocale(voice, appLocale) {
  if (!voice?.lang) {
    return false;
  }

  const prefix = normalizeAppLocale(appLocale) === "es" ? "es" : "en";
  return voice.lang.toLowerCase().startsWith(prefix);
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

  const prefix = normalizedLocale === "es" ? "es" : "en";
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ||
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
      (candidate) => candidate.name === voice.name && candidate.lang === voice.lang
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
