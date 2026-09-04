/**
 * Locale for the app shell.
 *
 * Keys are the English strings themselves. That is deliberate: a missing translation
 * degrades to English instead of showing a key, and rewording a string upstream leaves it
 * untranslated rather than breaking anything. There is no build step and no extraction —
 * `t("Projects")` reads as what it renders.
 *
 * Only the shell frame is covered so far: section headings, the actions button, the
 * context bar and the empty states. Everything else stays English until someone
 * translates it, which is a visible, harmless state rather than a broken one.
 *
 * The locale comes from the browser language, and a reader can pin it explicitly; the
 * explicit choice wins. Changing it takes effect on the next page load — strings are read
 * during render, and re-rendering the whole app on a locale change would need a reactive
 * layer that buys nothing for a setting people touch once.
 */
export type Locale = "en" | "ru";

export const LOCALE_STORAGE_KEY = "pi-web.locale";

const RU: Record<string, string> = {
  // Навигация
  "Machines": "Машины",
  "Projects": "Проекты",
  "Workspaces": "Воркспейсы",
  "Sessions": "Сессии",
  "Actions": "Действия",
  "Show Actions": "Показать действия",
  "Clean up": "Убрать",
  "Preview session cleanup": "Посмотреть, что будет убрано",
  // Строка контекста
  "Location": "Где я",
  "Current location": "Текущее место",
  "Machine": "Машина",
  "Project": "Проект",
  "Workspace": "Воркспейс",
  "Session": "Сессия",
  // Пустые состояния
  "Select a project": "Выбери проект",
  "Choose a project from the sidebar, then select a workspace to use its tools.":
    "Выбери проект в панели слева, потом воркспейс — и появятся его инструменты.",
  "Select a workspace to start a session.": "Выбери воркспейс, чтобы начать сессию.",
  "Add a project to start a session.": "Добавь проект, чтобы начать сессию.",
  "Select a project and workspace to start a session.":
    "Выбери проект и воркспейс, чтобы начать сессию.",
  "Loading projects…": "Загружаю проекты…",
  "Select or start a session.": "Выбери сессию или начни новую.",
  // Свёрнутая секция и строка контекста, когда ничего не выбрано. На телефоне это
  // первое, что видно, и до правки оно единственным островом оставалось английским.
  "No machine": "Машина не выбрана",
  "No project": "Проект не выбран",
  "No workspace": "Воркспейс не выбран",
  "No session": "Сессия не выбрана",
  "No machine selected": "Машина не выбрана",
  "No project selected": "Проект не выбран",
  "No workspace selected": "Воркспейс не выбран",
  "No session selected": "Сессия не выбрана",
  // Список сессий
  "Archived": "Архив",
  // Кнопки режима выбора («Archive», «Mark read», «Select visible») намеренно
  // оставлены английскими: тест апстрима ищет их по статическому тексту шаблона,
  // и перевод ломал бы его на каждом ребейзе ради двух кнопок, которых нет на
  // первом экране. Аргумент — стоимость слияний, а не «нельзя перевести».
  "Select archived sessions": "Выбрать сессии из архива",
  "Close archived session selection": "Отменить выбор сессий",
  // Подсказки строк списка
  "Machine actions": "Действия с машиной",
  "Workspace actions and details": "Действия и сведения о воркспейсе",
};

/**
 * Формы существительных для счётного оборота. Английскому хватает правила «+s», русскому
 * нужны три формы, и выбор между ними — не «последняя цифра»: 11 и 111 идут по «многим»,
 * 21 и 101 — по «одной».
 */
const RU_PLURALS: Record<string, readonly [string, string, string]> = {
  message: ["сообщение", "сообщения", "сообщений"],
};

const CATALOGS: Record<Locale, Record<string, string>> = { en: {}, ru: RU };

let pinned: Locale | undefined;

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ru";
}

/** Explicit choice wins; otherwise the browser language decides. */
export function resolveLocale(browserLanguage: string | undefined, stored: string | null): Locale {
  if (isLocale(stored)) return stored;
  return (browserLanguage ?? "").toLowerCase().startsWith("ru") ? "ru" : "en";
}

/* Оба глобала читаются через Reflect, а не напрямую: по типам они есть всегда, а в жизни
   нет — на сервере при рендере в тестах, в приватном окне при запрете на site data. Тип
   утверждает одно, среда бывает другой; здесь важнее среда. */
function browserLanguage(): string | undefined {
  const nav: unknown = Reflect.get(globalThis, "navigator");
  if (typeof nav !== "object" || nav === null) return undefined;
  const language: unknown = Reflect.get(nav, "language");
  return typeof language === "string" ? language : undefined;
}

function storedLocale(): string | null {
  try {
    const storage: unknown = Reflect.get(globalThis, "localStorage");
    if (typeof storage !== "object" || storage === null) return null;
    const getItem: unknown = Reflect.get(storage, "getItem");
    if (typeof getItem !== "function") return null;
    const value: unknown = Reflect.apply(getItem, storage, [LOCALE_STORAGE_KEY]);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export function locale(): Locale {
  pinned ??= resolveLocale(browserLanguage(), storedLocale());
  return pinned;
}

/** For tests and for a caller that already knows the locale. */
export function setLocale(value: Locale | undefined): void {
  pinned = value;
}

export function t(text: string): string {
  return CATALOGS[locale()][text] ?? text;
}

function russianPluralForm(count: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(Math.trunc(count));
  const tail = abs % 100;
  if (tail >= 11 && tail <= 14) return forms[2];
  const last = abs % 10;
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

/**
 * Счётный оборот: `tPlural(3, "message")` → «3 сообщения» / "3 messages".
 *
 * Ключ — английское существительное в единственном числе, как и у `t()`. Незнакомое слово
 * склоняется по английскому правилу: показать "3 widgets" в русском интерфейсе честнее,
 * чем упасть или напечатать ключ.
 */
export function tPlural(count: number, noun: string): string {
  const forms = locale() === "ru" ? RU_PLURALS[noun] : undefined;
  const word = forms === undefined ? (count === 1 ? noun : `${noun}s`) : russianPluralForm(count, forms);
  return `${String(count)} ${word}`;
}

/**
 * Publish the resolved locale as `<html lang>`.
 *
 * Correct HTML in its own right — assistive technology reads it — and it doubles as the
 * one place anything else can learn the language without repeating how it was decided.
 * Plugins render into the same document, and a rule copied into each of them is a rule
 * that eventually disagrees with this one.
 */
export function publishLocaleToDocument(): void {
  const documentRef: unknown = Reflect.get(globalThis, "document");
  if (typeof documentRef !== "object" || documentRef === null) return;
  const root: unknown = Reflect.get(documentRef, "documentElement");
  if (typeof root !== "object" || root === null) return;
  const setAttribute: unknown = Reflect.get(root, "setAttribute");
  if (typeof setAttribute !== "function") return;
  Reflect.apply(setAttribute, root, ["lang", locale()]);
}
