/**
 * ブラックリスト照合モジュール
 *
 * ルールセットの以下のタイプに対して照合を行う:
 *   - `type: "blacklist"`         … 手動管理エントリ
 *   - `type: "jpcert_blacklist"`  … JPCERT/CC フィッシングURLリストから自動取得したエントリ
 */

/**
 * @param {string} hostname - チェック対象のホスト名（例: "evil.example.com"）
 * @param {Array<Object>} rules - rules.json の rules 配列
 * @returns {{ matched: boolean, rule: Object|null }}
 */
export function checkBlacklist(hostname, rules) {
  const BLACKLIST_TYPES = new Set(["blacklist", "jpcert_blacklist"]);
  const blacklist = rules.filter(r => BLACKLIST_TYPES.has(r.type));

  for (const rule of blacklist) {
    if (hostname === rule.domain || hostname.endsWith(`.${rule.domain}`)) {
      return { matched: true, rule };
    }
  }

  return { matched: false, rule: null };
}
