/**
 * バックグラウンドサービスワーカー
 *
 * 役割:
 *   1. alarm による定期フェッチでルールセットを更新・キャッシュ
 *   2. webNavigation イベントでブラックリスト照合
 *   3. ヒット時に warning_banner.js をタブへ注入
 */

import { checkBlacklist } from "./detectors/blacklist.js";

const RULES_URL =
  "https://raw.githubusercontent.com/kinnringo/gokujo-security/main/rules.json";
const STORAGE_KEY = "cachedRules";
const ALARM_NAME = "fetchRules";
const FETCH_INTERVAL_MINUTES = 360; // 6時間

// ── 初期化 ──────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await fetchAndCacheRules();
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: FETCH_INTERVAL_MINUTES });
});

chrome.runtime.onStartup.addListener(async () => {
  await fetchAndCacheRules();
});

// ── ルールセット取得 ─────────────────────────────────────

async function fetchAndCacheRules() {
  try {
    const res = await fetch(RULES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    console.log("[gokujo] rules updated:", data.version);
  } catch (err) {
    console.warn("[gokujo] fetch failed, using cached rules:", err.message);
  }
}

async function getCachedRules() {
  const { [STORAGE_KEY]: data } = await chrome.storage.local.get(STORAGE_KEY);
  if (data) return data.rules;

  // フォールバック: 拡張機能同梱の初期データを使用
  const fallbackUrl = chrome.runtime.getURL("data/rules_fallback.json");
  const res = await fetch(fallbackUrl);
  const fallback = await res.json();
  return fallback.rules;
}

// ── alarm ───────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await fetchAndCacheRules();
  }
});

// ── ナビゲーション検知 ───────────────────────────────────

chrome.webNavigation.onCommitted.addListener(async ({ tabId, url, frameId }) => {
  if (frameId !== 0) return; // メインフレームのみ
  if (!url.startsWith("http")) return;

  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }

  const rules = await getCachedRules();
  const { matched, rule } = checkBlacklist(hostname, rules);

  if (matched) {
    console.warn(`[gokujo] blacklist hit: ${hostname} (${rule.id})`);
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content_scripts/warning_banner.js"],
    });
    // banner に rule 情報を渡す
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (reason) => window.__gokujoReason = reason,
      args: [rule.reason],
    });
  }
});
