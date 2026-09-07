#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import io
# Windows コンソールの cp932 エンコードエラーを回避
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

"""
JPCERT/CC フィッシングURLリスト取得スクリプト
======================================================
JPCERTCC/phishurl-list リポジトリから直近3ヶ月分の CSV を取得し、
gokujo-security の rules.json にブラックリストエントリとして統合する。

処理フロー:
  1. GitHub API でリポジトリのファイル一覧を取得
  2. 存在する YYYYMM.csv の中から最新月を特定し、直近3ヶ月を選択
  3. CSV をダウンロードし、URL からドメインを抽出・重複排除
  4. 合計が 8000 件を超える場合は古い月から除外
  5. rules.json の jpcert_blacklist エントリを差し替え（手動エントリは保持）
  6. 変更がなければ rules.json を書き換えない（GitHub Actions のコミットをスキップ可能にする）
"""

import json
import re
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

# ── 定数 ──────────────────────────────────────────────────────────────────────

JPCERT_REPO = "JPCERTCC/phishurl-list"
RAW_BASE = "https://raw.githubusercontent.com/JPCERTCC/phishurl-list/main"
API_TREE_URL = (
    f"https://api.github.com/repos/{JPCERT_REPO}/git/trees/main?recursive=1"
)

# 直近何ヶ月分を取得するか
MONTHS_TO_FETCH = 3

# ドメイン件数の上限
MAX_DOMAINS = 8000

# rules.json のパス（スクリプトの2階層上がリポジトリルート）
SCRIPT_DIR = Path(__file__).parent
RULES_JSON_PATH = SCRIPT_DIR.parent / "rules.json"

# jpcert エントリの type 識別子
JPCERT_TYPE = "jpcert_blacklist"

# CSV ファイル名のパターン
CSV_PATTERN = re.compile(r"^(\d{4})/(\d{6})\.csv$")


# ── ユーティリティ ──────────────────────────────────────────────────────────────

def fetch_json(url: str) -> dict:
    """URL から JSON を取得して返す。"""
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "gokujo-security-updater"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def fetch_text(url: str) -> str:
    """URL からテキストを取得して返す。"""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "gokujo-security-updater"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_domain(url_str: str) -> str | None:
    """URL 文字列からホスト名（ドメイン）を抽出する。失敗時は None。"""
    url_str = url_str.strip()
    if not url_str:
        return None
    try:
        parsed = urlparse(url_str)
        host = parsed.hostname  # 小文字化済み
        if not host:
            return None
        # IP アドレスは除外しない（フィッシングでも使われるため残す）
        return host
    except Exception:
        return None


# ── コアロジック ──────────────────────────────────────────────────────────────

def get_available_csv_months() -> list[str]:
    """
    GitHub API でリポジトリのファイルツリーを取得し、
    存在する YYYYMM の文字列リストを昇順で返す。
    例: ["202601", "202602", "202603", "202604", "202605"]
    """
    print(f"[info] GitHub API からファイルツリーを取得: {API_TREE_URL}")
    tree_data = fetch_json(API_TREE_URL)

    months: list[str] = []
    for item in tree_data.get("tree", []):
        path = item.get("path", "")
        m = CSV_PATTERN.match(path)
        if m:
            months.append(m.group(2))  # YYYYMM 部分

    months.sort()
    print(f"[info] 検出された月ファイル: {months}")
    return months


def select_target_months(all_months: list[str], count: int = MONTHS_TO_FETCH) -> list[str]:
    """
    最新月を基点として、直近 count ヶ月分を選択して返す。
    例: ["202603", "202604", "202605"]
    """
    if not all_months:
        return []
    return all_months[-count:]


def download_and_parse_csv(yyyymm: str) -> list[dict]:
    """
    指定された YYYYMM の CSV をダウンロードし、
    {domain, description, source_month} のリストを返す。
    ドメイン重複はこの段階では排除しない（月をまたいだ重複は後段で排除）。
    """
    year = yyyymm[:4]
    url = f"{RAW_BASE}/{year}/{yyyymm}.csv"
    print(f"[info] CSV 取得: {url}")

    try:
        text = fetch_text(url)
    except urllib.error.HTTPError as e:
        print(f"[warn] CSV 取得失敗 ({e.code}): {url} — スキップ")
        return []

    rows = []
    seen_domains: set[str] = set()
    lines = text.splitlines()

    for i, line in enumerate(lines):
        if i == 0:
            # ヘッダー行スキップ
            continue
        line = line.strip()
        if not line:
            continue

        # CSV パース: "date,URL,description"
        # description 自体にカンマが含まれる可能性を考慮して分割は2回だけ
        parts = line.split(",", 2)
        if len(parts) < 2:
            continue

        raw_url = parts[1].strip().strip('"')
        description = parts[2].strip().strip('"') if len(parts) > 2 else ""

        domain = extract_domain(raw_url)
        if not domain:
            continue

        # この月内での重複排除
        if domain in seen_domains:
            continue
        seen_domains.add(domain)

        rows.append({
            "domain": domain,
            "description": description,
            "source_month": yyyymm,
        })

    print(f"[info] {yyyymm}: {len(rows)} ドメイン（重複排除済み）")
    return rows


def build_entries(target_months: list[str]) -> list[dict]:
    """
    対象月分のエントリを構築する。
    月をまたいだドメイン重複も排除し、合計が MAX_DOMAINS を超える場合は
    古い月から除外して上限に収める。
    """
    # 各月のデータを取得（古い順）
    monthly_data: list[tuple[str, list[dict]]] = []
    for yyyymm in target_months:
        rows = download_and_parse_csv(yyyymm)
        monthly_data.append((yyyymm, rows))

    # 8000件超の場合は古い月を除外（月単位）
    while monthly_data:
        total = sum(len(rows) for _, rows in monthly_data)
        if total <= MAX_DOMAINS:
            break
        removed_month, removed_rows = monthly_data.pop(0)
        print(
            f"[info] 合計 {total} 件 > {MAX_DOMAINS} 件 - "
            f"{removed_month} ({len(removed_rows)} 件) を除外"
        )

    if not monthly_data:
        print("[warn] 全月を除外しても上限超過。最新月のみで再試行。")
        # 最新月だけは必ず含める（上限を超えていても）
        latest = target_months[-1]
        monthly_data = [(latest, download_and_parse_csv(latest))]

    # 月をまたいだドメイン重複排除（新しい月を優先）
    # 古い月から順に処理し、新しい月で上書き
    domain_to_entry: dict[str, dict] = {}
    for yyyymm, rows in monthly_data:
        for row in rows:
            domain_to_entry[row["domain"]] = row

    # rules.json エントリ形式に変換
    entries = []
    counter = 1
    used_months = sorted({r["source_month"] for r in domain_to_entry.values()})
    print(f"[info] 使用月: {used_months}, ドメイン合計: {len(domain_to_entry)} 件")

    for domain, row in sorted(domain_to_entry.items()):
        entries.append({
            "type": JPCERT_TYPE,
            "id": f"jpcert-{row['source_month']}-{counter:04d}",
            "domain": domain,
            "reason": row["description"] or "JPCERT/CC フィッシングURLリスト",
            "source_month": row["source_month"],
            "added_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        })
        counter += 1

    return entries


def update_rules_json(new_jpcert_entries: list[dict]) -> bool:
    """
    rules.json を読み込み、jpcert_blacklist エントリを差し替えて書き込む。
    変更がなかった場合は False、変更があった場合は True を返す。
    """
    if not RULES_JSON_PATH.exists():
        print(f"[error] rules.json が見つかりません: {RULES_JSON_PATH}")
        sys.exit(1)

    with open(RULES_JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    # 手動エントリ（blacklist, brand_impersonation 等）を保持し、jpcert エントリのみ入れ替え
    manual_rules = [r for r in data.get("rules", []) if r.get("type") != JPCERT_TYPE]
    new_rules = manual_rules + new_jpcert_entries

    # 変更検出: jpcert エントリのドメイン集合を比較
    old_jpcert_domains = {
        r["domain"] for r in data.get("rules", []) if r.get("type") == JPCERT_TYPE
    }
    new_jpcert_domains = {r["domain"] for r in new_jpcert_entries}

    if old_jpcert_domains == new_jpcert_domains:
        print("[info] jpcert エントリに変更なし。rules.json は更新しません。")
        return False

    data["rules"] = new_rules
    data["version"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(RULES_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    added = new_jpcert_domains - old_jpcert_domains
    removed = old_jpcert_domains - new_jpcert_domains
    print(
        f"[info] rules.json 更新完了 - "
        f"追加: {len(added)} 件, 削除: {len(removed)} 件, "
        f"jpcert 合計: {len(new_jpcert_entries)} 件"
    )
    return True


# ── エントリポイント ────────────────────────────────────────────────────────────

def main() -> None:
    print("=== JPCERT フィッシングURLリスト更新 ===")
    print(f"対象ファイル: {RULES_JSON_PATH}")

    # 1. 利用可能な月ファイルを取得
    all_months = get_available_csv_months()
    if not all_months:
        print("[error] JPCERT リポジトリから CSV ファイルが見つかりませんでした。")
        sys.exit(1)

    # 2. 直近3ヶ月を選択
    target_months = select_target_months(all_months, MONTHS_TO_FETCH)
    print(f"[info] 取得対象月: {target_months}")

    # 3. CSVをダウンロードしてエントリを構築
    new_entries = build_entries(target_months)
    print(f"[info] 生成エントリ数: {len(new_entries)}")

    # 4. rules.json を更新
    changed = update_rules_json(new_entries)

    # GitHub Actions の outputs として変更有無を出力
    # (if: steps.update.outputs.changed == 'true' でコミットを制御できる)
    github_output = Path(
        __import__("os").environ.get("GITHUB_OUTPUT", "/dev/null")
    )
    try:
        with open(github_output, "a", encoding="utf-8") as f:
            f.write(f"changed={'true' if changed else 'false'}\n")
    except Exception:
        pass  # ローカル実行時は無視

    print("=== 完了 ===")


if __name__ == "__main__":
    main()
