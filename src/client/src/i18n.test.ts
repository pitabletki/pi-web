import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALE_STORAGE_KEY, publishLocaleToDocument, resolveLocale, setLocale, t } from "./i18n";

afterEach(() => {
  setLocale(undefined);
  vi.unstubAllGlobals();
});

describe("resolveLocale", () => {
  it("lets an explicit choice win over the browser", () => {
    expect(resolveLocale("en-US", "ru")).toBe("ru");
    expect(resolveLocale("ru-RU", "en")).toBe("en");
  });

  it("follows the browser language when nothing is pinned", () => {
    expect(resolveLocale("ru-RU", null)).toBe("ru");
    expect(resolveLocale("ru", null)).toBe("ru");
    expect(resolveLocale("en-GB", null)).toBe("en");
  });

  it("falls back to English on junk instead of guessing", () => {
    expect(resolveLocale(undefined, null)).toBe("en");
    expect(resolveLocale("", "de")).toBe("en");
    expect(resolveLocale("ru-RU", "klingon")).toBe("ru");
  });

  it("names the storage key it reads, so a switcher can write the same one", () => {
    expect(LOCALE_STORAGE_KEY).toBe("pi-web.locale");
  });
});

describe("publishLocaleToDocument", () => {
  it("writes the resolved locale to <html lang> so plugins need no copy of the rule", () => {
    const attributes: [string, string][] = [];
    const documentStub = { documentElement: { setAttribute: (name: string, value: string) => { attributes.push([name, value]); } } };
    vi.stubGlobal("document", documentStub);
    setLocale("ru");

    publishLocaleToDocument();

    expect(attributes).toEqual([["lang", "ru"]]);
  });

  it("says nothing when there is no document", () => {
    vi.stubGlobal("document", undefined);
    setLocale("ru");

    expect(() => { publishLocaleToDocument(); }).not.toThrow();
  });
});

describe("t", () => {
  it("translates a known string", () => {
    setLocale("ru");
    expect(t("Projects")).toBe("Проекты");
  });

  it("returns the English string when there is no translation", () => {
    setLocale("ru");
    // Непереведённая строка должна остаться читаемой, а не превратиться в ключ.
    expect(t("Squash and merge")).toBe("Squash and merge");
  });

  it("is a no-op in English", () => {
    setLocale("en");
    expect(t("Projects")).toBe("Projects");
    expect(t("Anything at all")).toBe("Anything at all");
  });
});
