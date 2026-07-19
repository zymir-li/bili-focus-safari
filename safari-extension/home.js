(() => {
  function init() {
  if (document.documentElement.dataset.biliFocusInitialized === "true") return;
  document.documentElement.dataset.biliFocusInitialized = "true";

  const localStorageApi = {
    storage: {
      local: {
        get(keys, callback) {
          const result = Object.fromEntries(
            keys.map((key) => [
              key,
              window.localStorage.getItem(`bili-focus-${key}`) ?? undefined,
            ]),
          );
          callback?.(result);
          return Promise.resolve(result);
        },
        set(values, callback) {
          Object.entries(values).forEach(([key, value]) => {
            window.localStorage.setItem(`bili-focus-${key}`, String(value));
          });
          callback?.();
          return Promise.resolve();
        },
      },
    },
  };
  const extensionApi = globalThis.browser?.storage?.local
    ? globalThis.browser
    : globalThis.chrome?.storage?.local
      ? globalThis.chrome
      : localStorageApi;
  const root = document.documentElement;
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("bili-search");
  const themeButton = document.getElementById("theme-button");
  const themeLabel = themeButton.querySelector(".utility-label");
  const shortcutLinks = [...document.querySelectorAll("[data-shortcut]")];

  let theme = "light";

  function storageGet(keys) {
    return new Promise((resolve) => {
      const result = extensionApi.storage.local.get(keys, resolve);
      if (result?.then) result.then(resolve);
    });
  }

  function storageSet(values) {
    return new Promise((resolve) => {
      const result = extensionApi.storage.local.set(values, resolve);
      if (result?.then) result.then(resolve);
    });
  }

  function applyTheme(nextTheme) {
    theme = nextTheme;
    root.dataset.theme = theme;
    themeLabel.textContent = theme === "light" ? "深色" : "浅色";
    themeButton.setAttribute(
      "aria-label",
      theme === "light" ? "切换到深色模式" : "切换到浅色模式",
    );
  }

  async function initialize() {
    const stored = await storageGet(["theme"]);
    const preferredTheme =
      stored.theme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    applyTheme(preferredTheme);
  }

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const keyword = searchInput.value.trim();
    if (!keyword) {
      searchInput.focus();
      return;
    }
    window.location.assign(
      `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`,
    );
  });

  themeButton.addEventListener("click", async () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
    await storageSet({ theme: nextTheme });
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing =
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    if (event.key === "/" && !typing) {
      event.preventDefault();
      searchInput.focus();
      return;
    }

    if (
      !typing && ["1", "2", "3", "4"].includes(event.key)
    ) {
      const link = shortcutLinks[Number(event.key) - 1];
      window.location.assign(link.href);
    }
  });

  initialize();
  }

  globalThis.BiliFocusHome = { init };

  const isExtensionPage =
    location.protocol !== "http:" && location.protocol !== "https:";
  if (isExtensionPage) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  }
})();
