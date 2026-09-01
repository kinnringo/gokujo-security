/**
 * ブラックリストヒット時に注入される警告UI
 *   - 画面上部：バナー（常時表示）
 *   - 画面中央：モーダルポップアップ（初回表示、閉じると消える）
 *
 * background.js から executeScript で動的注入されるため、
 * 単体で完結する設計（外部依存なし）にする。
 */

(function () {
  if (document.getElementById("gokujo-warning-banner")) return;

  const reason = window.__gokujoReason || "既知のフィッシングサイトです";
  const host = location.hostname;

  // ── DOM構築 ──────────────────────────────────────────

  const style = document.createElement("style");
  style.textContent = `
    /* バナー（上部固定） */
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
    #gokujo-banner-icon { font-size: 20px; }
    #gokujo-banner-text { display: flex; flex-direction: column; flex: 1; gap: 2px; }
    #gokujo-banner-close {
      background: none;
      border: 1px solid rgba(255,255,255,0.5);
      color: #fff;
      cursor: pointer;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 14px;
    }
    #gokujo-banner-close:hover { background: rgba(255,255,255,0.15); }

    /* モーダル（中央ポップアップ） */
    #gokujo-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #gokujo-modal {
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 24px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: sans-serif;
      color: #333;
    }
    #gokujo-modal-title {
      font-size: 18px;
      font-weight: bold;
      color: #cc0000;
      margin-bottom: 12px;
    }
    #gokujo-modal-host {
      font-size: 14px;
      color: #666;
      margin-bottom: 12px;
      word-break: break-all;
    }
    #gokujo-modal-reason {
      font-size: 14px;
      margin-bottom: 24px;
    }
    #gokujo-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    #gokujo-modal-proceed {
      background: #fff;
      border: 1px solid #ccc;
      color: #333;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }
    #gokujo-modal-proceed:hover { background: #f0f0f0; }
    #gokujo-modal-back {
      background: #cc0000;
      border: 1px solid #cc0000;
      color: #fff;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }
    #gokujo-modal-back:hover { background: #aa0000; }
  `;

  // バナー
  const banner = document.createElement("div");
  banner.id = "gokujo-warning-banner";
  banner.innerHTML = `
    <div id="gokujo-banner-inner">
      <span id="gokujo-banner-icon">⚠️</span>
      <div id="gokujo-banner-text">
        <strong>Gokujo Security: 警告</strong>
        <span>${reason}</span>
      </div>
      <button id="gokujo-banner-close">✕</button>
    </div>
  `;

  // モーダル
  const overlay = document.createElement("div");
  overlay.id = "gokujo-modal-overlay";
  overlay.innerHTML = `
    <div id="gokujo-modal">
      <div id="gokujo-modal-title">警告：フィッシングサイトの疑い</div>
      <div id="gokujo-modal-host">アクセス先: ${host}</div>
      <div id="gokujo-modal-reason">${reason}</div>
      <div id="gokujo-modal-actions">
        <button id="gokujo-modal-proceed">無視して進む</button>
        <button id="gokujo-modal-back">前のページに戻る</button>
      </div>
    </div>
  `;

  // ── イベント ─────────────────────────────────────────

  document.documentElement.appendChild(style);
  document.documentElement.appendChild(banner);
  document.documentElement.appendChild(overlay);

  document.getElementById("gokujo-banner-close").addEventListener("click", () => {
    banner.remove();
  });

  document.getElementById("gokujo-modal-proceed").addEventListener("click", () => {
    overlay.remove();
  });

  document.getElementById("gokujo-modal-back").addEventListener("click", () => {
    history.back();
  });
})();
