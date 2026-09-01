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
      background: rgba(0, 0, 0, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: gokujo-fadein 0.2s ease;
    }
    @keyframes gokujo-fadein {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    #gokujo-modal {
      background: #1a1a2e;
      border: 1px solid #7f1d1d;
      border-radius: 12px;
      padding: 36px 40px;
      max-width: 480px;
      width: calc(100% - 48px);
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      font-family: system-ui, sans-serif;
      color: #f1f5f9;
      animation: gokujo-slidein 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes gokujo-slidein {
      from { transform: scale(0.88) translateY(16px); opacity: 0; }
      to   { transform: scale(1) translateY(0);      opacity: 1; }
    }
    #gokujo-modal-shield {
      font-size: 56px;
      text-align: center;
      margin-bottom: 16px;
      filter: drop-shadow(0 0 12px rgba(239,68,68,0.6));
    }
    #gokujo-modal-title {
      font-size: 20px;
      font-weight: 700;
      color: #ef4444;
      text-align: center;
      margin-bottom: 8px;
    }
    #gokujo-modal-host {
      font-size: 13px;
      text-align: center;
      color: #94a3b8;
      margin-bottom: 16px;
      word-break: break-all;
    }
    #gokujo-modal-reason {
      background: rgba(127, 29, 29, 0.3);
      border-left: 3px solid #ef4444;
      border-radius: 4px;
      padding: 10px 14px;
      font-size: 14px;
      color: #fca5a5;
      margin-bottom: 28px;
      line-height: 1.5;
    }
    #gokujo-modal-actions {
      display: flex;
      gap: 12px;
    }
    #gokujo-modal-proceed {
      flex: 1;
      background: transparent;
      border: 1px solid #475569;
      color: #94a3b8;
      padding: 10px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
    }
    #gokujo-modal-proceed:hover { border-color: #64748b; color: #cbd5e1; }
    #gokujo-modal-back {
      flex: 2;
      background: #ef4444;
      border: none;
      color: #fff;
      padding: 10px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    #gokujo-modal-back:hover { background: #dc2626; }
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
      <div id="gokujo-modal-shield">🛡️</div>
      <div id="gokujo-modal-title">フィッシングサイトの疑い</div>
      <div id="gokujo-modal-host">${host}</div>
      <div id="gokujo-modal-reason">${reason}</div>
      <div id="gokujo-modal-actions">
        <button id="gokujo-modal-proceed">このまま続ける</button>
        <button id="gokujo-modal-back">← 前のページに戻る</button>
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
