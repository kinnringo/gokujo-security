# Gokujo Security

フィッシング・ブランドなりすましサイト検知のためのChrome拡張機能（チーム内利用限定）。

## 構成

```
extension/        Chrome拡張機能本体（Manifest V3）
rules.json        GitHub Raw経由で拡張機能が定期取得するルールセット
mds/              設計ドキュメント（ローカル管理）
```

## 開発者向け

**拡張機能の読み込み方（開発時）**

1. Chromeで `chrome://extensions` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」から `extension/` ディレクトリを指定

**ルールセットの更新**

`rules.json` を編集してmainブランチへpushするだけで、拡張機能が次回アラーム（6時間毎）に自動取得する。
