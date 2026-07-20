(() => {
  const isBilibiliHome = location.hostname === "www.bilibili.com" &&
    location.pathname === "/";

  if (!isBilibiliHome) return;

  const extensionApi = globalThis.browser ?? globalThis.chrome;
  const root = document.documentElement;

  function showReady() {
    root.setAttribute("data-bili-focus-ready", "");
  }

  function storageGet(keys) {
    if (globalThis.browser?.storage?.local) {
      return globalThis.browser.storage.local.get(keys);
    }
    return new Promise((resolve) => {
      globalThis.chrome.storage.local.get(keys, resolve);
    });
  }

  function storageSet(values) {
    if (globalThis.browser?.storage?.local) {
      return globalThis.browser.storage.local.set(values);
    }
    return new Promise((resolve) => {
      globalThis.chrome.storage.local.set(values, resolve);
    });
  }

  function mountDisabledToggle() {
    if (document.getElementById("bili-focus-disabled-toggle")) return;

    const host = document.createElement("div");
    host.id = "bili-focus-disabled-toggle";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    const button = document.createElement("button");

    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        top: 72px;
        right: 24px;
        z-index: 2147483647;
      }
      button {
        appearance: none;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 12px;
        border: 1px solid rgba(23, 24, 18, 0.1);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 8px 28px rgba(20, 18, 18, 0.1);
        color: #73756d;
        font: 650 10px/1 -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
        letter-spacing: 0.12em;
        -webkit-backdrop-filter: blur(14px);
        backdrop-filter: blur(14px);
        cursor: pointer;
        transition: color 160ms ease, border-color 160ms ease, transform 160ms ease;
      }
      button::before {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #a5a79f;
        box-shadow: 0 0 0 3px rgba(165, 167, 159, 0.14);
      }
      button:hover {
        border-color: rgba(251, 114, 153, 0.42);
        color: #fb7299;
        transform: translateY(-1px);
      }
      button:focus-visible {
        outline: 2px solid rgba(251, 114, 153, 0.58);
        outline-offset: 3px;
      }
      button:disabled {
        cursor: wait;
        opacity: 0.62;
      }
      @media (prefers-color-scheme: dark) {
        button {
          border-color: rgba(255, 255, 255, 0.13);
          background: rgba(28, 28, 29, 0.9);
          color: #b9bbb4;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.24);
        }
      }
    `;
    button.type = "button";
    button.textContent = "FOCUS MODE OFF";
    button.setAttribute("aria-label", "开启 Bili Focus 专注模式");
    button.addEventListener("click", async () => {
      button.disabled = true;
      button.textContent = "TURNING ON";
      await storageSet({ focusEnabled: true });
      location.reload();
    });
    shadow.append(style, button);
    document.documentElement.append(host);
  }

  function showOriginalHomepage() {
    showReady();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mountDisabledToggle, {
        once: true,
      });
    } else {
      mountDisabledToggle();
    }
  }

  function ensureDocumentStructure() {
    if (!document.head) {
      document.documentElement.prepend(document.createElement("head"));
    }
    if (!document.body) {
      document.documentElement.append(document.createElement("body"));
    }
  }

  function renderRecovery(error) {
    console.error("[Bili Focus] Failed to render the focus home.", error);
    ensureDocumentStructure();
    document.head.replaceChildren();
    document.body.replaceChildren();
    document.title = "Bili Focus — 页面加载失败";

    const style = document.createElement("style");
    style.textContent = `
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #f4f3ef;
        color: #171812;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
      }
      main { width: min(440px, 100%); }
      p { color: #71736b; line-height: 1.7; }
      button {
        border: 0;
        border-radius: 999px;
        padding: 12px 20px;
        background: #fb7299;
        color: white;
        font: inherit;
        font-weight: 650;
        cursor: pointer;
      }
      @media (prefers-color-scheme: dark) {
        body { background: #11120f; color: #f4f3ef; }
        p { color: #a9aba2; }
      }
    `;

    const main = document.createElement("main");
    const title = document.createElement("h1");
    const copy = document.createElement("p");
    const retry = document.createElement("button");
    title.textContent = "专注首页加载失败";
    copy.textContent = "没有加载 Bilibili 信息流。请重试一次，或暂时停用 Bili Focus。";
    retry.textContent = "重新加载";
    retry.addEventListener("click", () => location.reload());
    main.append(title, copy, retry);
    document.head.append(style);
    document.body.append(main);
    showReady();
  }

  async function renderFocusHome() {
    const htmlUrl = extensionApi.runtime.getURL("home.html");
    const cssUrl = extensionApi.runtime.getURL("home.css");
    const response = await fetch(htmlUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`home.html returned ${response.status}`);

    const source = await response.text();
    const parsed = new DOMParser().parseFromString(source, "text/html");
    const body = document.importNode(parsed.body, true);
    body.querySelectorAll("script").forEach((script) => script.remove());

    ensureDocumentStructure();
    document.documentElement.lang = parsed.documentElement.lang || "zh-CN";
    document.head.replaceChildren();
    document.title = parsed.title;

    parsed.head
      .querySelectorAll("meta")
      .forEach((meta) => document.head.append(document.importNode(meta, true)));

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = cssUrl;
    const stylesheetReady = new Promise((resolve, reject) => {
      stylesheet.addEventListener("load", resolve, { once: true });
      stylesheet.addEventListener(
        "error",
        () => reject(new Error("home.css failed to load")),
        { once: true },
      );
    });
    document.head.append(stylesheet);
    document.body.replaceWith(body);

    await Promise.race([
      stylesheetReady,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("home.css load timed out")), 3000),
      ),
    ]);

    globalThis.BiliFocusHome.init();
    showReady();
  }

  async function start() {
    let focusEnabled = true;
    try {
      const stored = await storageGet(["focusEnabled"]);
      focusEnabled = stored.focusEnabled !== false;
    } catch (error) {
      console.warn("[Bili Focus] Could not read focus mode state.", error);
    }

    if (!focusEnabled) {
      showOriginalHomepage();
      return;
    }

    // Stop Bilibili before its feed, scripts, or styles can paint.
    window.stop();
    await renderFocusHome();
  }

  start().catch(renderRecovery);
})();
