/**
 * ブラックリスト照合モジュール
 *
 * ルールセットの `type: "blacklist"` エントリに対して、
 * 与えられたホスト名が完全一致するかを判定する。
 */

/**
 * @param {string} hostname - チェック対象のホスト名（例: "evil.example.com"）
 * @param {Array<Object>} rules - rules.json の rules 配列
 * @returns {{ matched: boolean, rule: Object|null }}
 */
export function checkBlacklist(hostname, rules) {
  const blacklist = rules.filter(r => r.type === "blacklist");

  for (const rule of blacklist) {
    if (hostname === rule.domain || hostname.endsWith(`.${rule.domain}`)) {
      return { matched: true, rule };
    }
  }

  return { matched: false, rule: null };
}
