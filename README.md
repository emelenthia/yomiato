# よみあと（Yomiato）

> 開きっぱなしを、読んだ跡へ。

後で読みたいWebページを未読Inboxへ集め、読み終えたら学び・気づき・感想を一言残して、自分だけの読書ログへ変えるChrome拡張機能です。

アカウント登録を必要とせず、ページ本文は保存しません。URL、タイトル、日時、ステータス、自分が入力した記録をブラウザ内で管理する、ローカルファーストのプロダクトを目指しています。

## インストール

Node.js 24を用意して、プロジェクトのルートで次を実行します。

```sh
pnpm install --frozen-lockfile
pnpm run build
```

Chromeで`chrome://extensions`を開き、右上の「デベロッパーモード」を有効にします。「パッケージ化されていない拡張機能を読み込む」を選び、生成された`.output/chrome-mv3`フォルダを指定してください。

## 開発状況

現在は企画・技術設計段階です。

- [企画・開発計画書](docs/product-plan.md)
- [技術設計書・ADR](docs/technical-design.md)
- [MVP実装手順書](docs/implementation-guide.md)

## AIを利用した開発について

このプロジェクトは、OpenAI Codexを中心としたAI支援を利用して制作しています。
