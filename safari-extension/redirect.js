(() => {
  const isBilibiliHome = location.hostname === "www.bilibili.com" &&
    location.pathname === "/";

  if (!isBilibiliHome) return;

  const extensionApi = globalThis.browser ?? globalThis.chrome;
  const root = document.documentElement;

  // Stop Bilibili's document before its feed, scripts, or styles can paint.
  window.stop();

  function showReady() {
    root.setAttribute("data-bili-focus-ready", "");
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

  renderFocusHome().catch(renderRecovery);
})();
