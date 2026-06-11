import {
  getStoredAppLocale,
  normalizeAppLocale,
  persistAppLocale,
  resolveSpeechLanguageForAppLocale,
  resolveSpeechVoice,
  syncStoredSpeechLanguage,
  voiceMatchesAppLocale,
} from "@/composables/speechVoice";
import { beforeEach, describe, expect, it } from "vitest";

const voices = [
  { name: "Alex", lang: "en-US" },
  { name: "Daniel", lang: "en-GB" },
  { name: "Monica", lang: "es-ES" },
  { name: "Paulina", lang: "es-MX" },
];

describe("speechVoice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("normalizes supported app locales", () => {
    expect(normalizeAppLocale("es")).toBe("es");
    expect(normalizeAppLocale("en")).toBe("en");
    expect(normalizeAppLocale(undefined)).toBe("en");
  });

  it("maps app locale to a default speech language code", () => {
    expect(resolveSpeechLanguageForAppLocale("es")).toBe("es-ES");
    expect(resolveSpeechLanguageForAppLocale("en")).toBe("en-US");
  });

  it("detects whether a voice matches the app locale", () => {
    expect(voiceMatchesAppLocale(voices[2], "es")).toBe(true);
    expect(voiceMatchesAppLocale(voices[0], "es")).toBe(false);
  });

  it("prefers a stored voice when it matches the app locale", () => {
    localStorage.setItem("selectedVoiceIndex", "3");

    expect(resolveSpeechVoice(voices, "es")).toEqual(voices[3]);
  });

  it("falls back to a Spanish voice when the stored voice is English", () => {
    localStorage.setItem("selectedVoiceIndex", "0");

    expect(resolveSpeechVoice(voices, "es")).toEqual(voices[2]);
  });

  it("falls back to an English voice when the app locale is English", () => {
    localStorage.setItem("selectedVoiceIndex", "2");

    expect(resolveSpeechVoice(voices, "en")).toEqual(voices[0]);
  });

  it("syncs stored speech language and voice index for Spanish", () => {
    localStorage.setItem("selectedVoiceIndex", "0");

    const result = syncStoredSpeechLanguage(voices, "es");

    expect(result.speechLang).toBe("es-ES");
    expect(result.voice).toEqual(voices[2]);
    expect(localStorage.getItem("selectedLanguage")).toBe("es-ES");
    expect(localStorage.getItem("selectedVoiceIndex")).toBe("2");
  });

  it("persists and reads the app locale from localStorage", () => {
    persistAppLocale("es");
    expect(getStoredAppLocale()).toBe("es");
  });
});
