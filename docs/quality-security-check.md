---
date: 2026-08-11
tags: [quality, security, release]
project: yomiato
related: [[Projects/yomiato]]
---
# 品質・セキュリティ確認

## 自動確認

工程13の順序で次の確認を実行する。

1. `npm run format:check` — 全ファイルがPrettierのチェックに成功
2. `npm run lint` — ESLintが成功
3. `npm run typecheck` — TypeScriptの型検査が成功
4. `npm test` — 11ファイル、108件が成功
5. `npm run build` — Manifestを含む15ファイル、合計430.26 kBの生成に成功
6. `npm run test:e2e` — MVPの8シナリオが成功
7. `npm run zip` — `yomiato-0.0.0-chrome.zip`（134.32 kB）の生成に成功
8. `npm run verify:release` — Manifest、権限、生成物15ファイル、ZIP内容の検証に成功

`verify:release` は、生成されたManifestがManifest V3であること、`activeTab`と`tabs`以外の権限がないこと、host permissions・Content Script・外部接続設定・`optional_host_permissions`・`content_security_policy`がないことを確認する。生成HTML・CSSの外部アセット参照、生成JavaScriptの実行時ネットワークAPI、inline script、source map、`eval`、動的関数生成、テストやdocsの混入も確認し、ZIPが生成ディレクトリと同じ内容であることを検証する。WXTの既知のブラウザ互換チャンクに含まれるAPI文字列だけは許可し、それ以外の生成JavaScriptで検出した場合は失敗させる。

## 手動確認

| 対象 | 結果 |
| --- | --- |
| ニュース記事、ブログ、技術文書、長いURL、日本語・英語タイトル | 要確認: 実ブラウザを手動操作できる環境で実施 |
| fragment、tracking parameter、必要なquery parameterを含むURL | 自動テストで確認済み |
| `chrome://`、Chromeウェブストア、拡張ページ、file URL、PDF | 自動テストで対応外として確認済み |
| titleなし、長いtitle、長いreflection | 自動テストで境界値を確認済み |
| tabs権限の許可・拒否・設定画面からの取消 | E2Eで許可・拒否を確認済み。取消は要確認 |
| ブラウザ再起動、拡張機能再読み込み、Service Worker停止 | E2Eで再起動相当と永続性を確認済み。実ブラウザ操作は要確認 |
| キーボード操作、200% zoom、ライト・ダーク | キーボード操作はUIテストで確認済み。zoomと実ブラウザ配色は要確認 |
| 空DB、数百件程度のfixture、壊れたバックアップ | 空DBと壊れたバックアップは自動テストで確認済み。数百件fixtureは要確認 |
| 依存パッケージを含む生成JavaScriptバンドルの外部通信 | アプリケーションソースと生成アプリチャンクは自動検査済み。WXTブラウザ互換チャンクを含む依存コードの実行時通信は要確認 |

この実行では実ブラウザを手動操作していないため、新規インストールを伴う項目は要確認として記録する。自動テストで確認できる範囲は、テスト結果とリリース検証スクリプトの出力をPR本文に記載する。
