/**
 * ブラックリストヒット時に注入される警告バナー
 *
 * background.js から executeScript で動的注入されるため、
 * 単体で完結する設計（外部依存なし）にする。
 */

(function () {
  if (document.getElementById("gokujo-warning-banner")) return;

  const reason = window.__gokujoReason || "既知のフィッシングサイトです";

  const banner = document.createElement("div");
  banner.id = "gokujo-warning-banner";
  banner.innerHTML = `
    <div id="gokujo-banner-inner">
      <span id="gokujo-icon">⚠️</span>
      <div id="gokujo-text">
        <strong>Gokujo Security: 警告</strong>
        <span>${reason}</span>
      </div>
      <button id="gokujo-close">✕</button>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #gokujo-warning-banner {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 2147483647;
      background: #b91c1c;
      color: #fff;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      padding: 10px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    #gokujo-banner-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 900px;
      margin: 0 auto;
    }
    #gokujo-icon { font-size: 20px; }
    #gokujo-text { display: flex; flex-direction: column; flex: 1; gap: 2px; }
    #gokujo-close {
      background: none;
      border: 1px solid rgba(255,255,255,0.5);
      color: #fff;
      cursor: pointer;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 14px;
    }
    #gokujo-close:hover { background: rgba(255,255,255,0.15); }
  `;

  document.documentElement.appendChild(style);
  document.documentElement.appendChild(banner);

  document.getElementById("gokujo-close").addEventListener("click", () => {
    banner.remove();
    style.remove();
  });
})();
