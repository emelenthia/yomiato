# よみあと（Yomiato）技術設計書・ADR

- 文書ステータス: 初版
- 作成日: 2026-08-09
- 対象: Chrome拡張機能 MVP〜Chromeウェブストア公開版
- 関連文書: [企画・開発計画書](product-plan.md)

## 1. 文書の目的

本書は、よみあとのMVPを実装し、将来的にChromeウェブストアへ公開するための技術方針を定める。具体的なコードや画面デザインではなく、採用技術、責務分割、データ構造、フォルダ構成、権限、品質保証、公開方法に関する判断を記録する。

技術選定は次のプロダクト要件を優先する。

- アカウント不要・ローカルファーストであること。
- ページ本文を取得・保存しないこと。
- 現在のページと開いているタブのタイトル・URLを取り込めること。
- 未読Inbox、読了記録、再読、断念、検索、バックアップを扱えること。
- 小さく開始しつつ、データを失わず機能追加できること。
- ChromeウェブストアのManifest V3と審査要件へ適合すること。
- AI支援で生成されたコードを、型・テスト・静的解析で検証しやすいこと。

## 2. 技術方針の要約

| 項目 | 採用方針 |
| --- | --- |
| 対象ブラウザ | Chromeを初期対象。将来はChromium系とFirefoxを検討 |
| 拡張仕様 | Manifest V3 |
| 言語 | TypeScript（strictモード） |
| UI | React |
| 拡張機能フレームワーク | WXT |
| ビルド基盤 | WXTが利用するVite |
| 永続化 | IndexedDB |
| IndexedDBラッパー | Dexie |
| DBとReactの接続 | dexie-react-hooks |
| 入出力検証 | Zod |
| スタイル | CSS Modules + CSS Custom Properties |
| 単体・結合テスト | Vitest + Testing Library |
| IndexedDBテスト | fake-indexeddb |
| E2Eテスト | Playwright + Chromium |
| 静的解析 | TypeScript、ESLint、eslint-plugin-react-hooks、eslint-plugin-jsx-a11y |
| フォーマット | Prettier |
| パッケージ管理 | npm + package-lock.json |
| バックエンド | MVPでは作らない |
| テレメトリー | MVPでは収集しない |
| バックアップ | バージョン付きJSONの手動エクスポート／インポート |

## 3. 設計原則

### 3.1 ローカルファースト

ユーザーの未読ページ、読了履歴、感想は、ブラウザのローカル領域に保存する。MVPではサーバー、ユーザーアカウント、外部APIを持たない。

ローカルファーストは「バックアップ不要」を意味しない。ブラウザデータの削除や端末故障に備え、MVPから手動バックアップと復元を提供する。

### 3.2 最小権限

インストール時に要求する権限を最小限にする。全タブのタイトル・URL取得やブックマーク取り込みなど、利用者が明示的に開始する機能は、可能な限り任意権限として実行時に要求する。

### 3.3 ページ本文へ介入しない

ページ内容の解析、DOM操作、ハイライト、本文保存を行わないため、MVPではContent Scriptとホスト権限を使用しない。ページ情報はChrome Tabs APIが提供するURLとタイトルから取得する。

### 3.4 UIとドメインを分離する

未読登録、読了、再読、断念、URL重複判定などのルールをReactコンポーネントへ直接書かない。ドメインモデルとユースケースとして分離し、単体テスト可能にする。

### 3.5 Service Workerへ永続状態を置かない

Manifest V3のService Workerは必要なときだけ起動し、停止・再起動される。メモリ上の変数を正しい状態の保存先として扱わず、永続状態はIndexedDBまたはChrome Storageへ保存する。

### 3.6 依存ライブラリを増やしすぎない

Chrome拡張は複数の実行コンテキストを持つため、一般的なWebアプリ以上に構成が複雑になりやすい。MVPではルーター、グローバル状態管理、UIコンポーネント集、日付ライブラリ、全文検索エンジンを原則導入しない。

## 4. システム構成

### 4.1 実行コンテキスト

よみあとは次の3つの実行コンテキストで構成する。

#### Popup

Chromeツールバーのアイコンから開く、小さなクイック操作画面。

責務:

- 現在のページ情報を表示する。
- 現在のページをInboxへ追加する。
- 現在のページを直接「読了として記録」する導線を出す。
- 現在のページがInboxまたは過去のLogに存在するかを表示する。
- 管理画面を開く。

Popupはフォーカスを外すと閉じるため、長い入力や複数タブの整理には使用しない。

#### Dashboard

拡張機能内の通常ページとして新しいタブに開く、主要管理画面。

責務:

- 未読Inboxの一覧と操作。
- 開いている複数タブの選択取り込み。
- 読了・断念操作と振り返り入力。
- 読書ログの一覧、検索、編集、削除。
- 再読記録。
- 設定、バックアップ、復元、全データ削除。

MVPではSide PanelではなくDashboardを採用する。管理対象が多く、長い入力・検索・バックアップを行うため、十分な表示領域と安定したページ寿命が必要だからである。

#### Background Service Worker

ブラウザイベントに応答する、Manifest V3のバックグラウンド処理。

責務:

- 拡張機能のインストール・更新イベント処理。
- 必要に応じたコンテキストメニューやショートカット処理。
- Dashboardを開くブラウザ操作。
- 将来の通知やバッジ更新。

MVPでは業務ロジックや唯一のデータアクセスポイントにしない。Service Workerを経由しないと保存できない構成にすると、停止・再起動やメッセージングが不要な複雑さを生むためである。

### 4.2 採用しない実行コンテキスト

#### Content Script

MVPでは使用しない。ページ本文を読まず、DOMへUIを追加しないため不要である。

#### Side Panel

MVPでは使用しない。将来、読書中にメモを残す需要が確認された場合に検討する。PopupとDashboardを先に確立し、UI入口を増やしすぎない。

#### Offscreen Document

常駐処理、音声、DOM依存のバックグラウンド処理を行わないため使用しない。

## 5. 論理アーキテクチャ

### 5.1 レイヤー構成

```text
Entrypoints / UI
  Popup・Dashboard・Background
            ↓
Application
  ユースケース、入力検証、トランザクション境界
            ↓
Domain
  エンティティ、値、状態遷移、ドメインルール
            ↓
Ports
  Repository・Browser Gateway・Clock・ID Generatorの契約
            ↓
Infrastructure
  Dexie、Chrome/WXT Browser API、JSON Backup
```

依存方向は上から下とし、DomainはReact、Dexie、Chrome APIへ依存しない。

### 5.2 UIレイヤー

Reactコンポーネントと画面固有の状態を持つ。

- DBレコードをそのまま編集せず、Applicationのユースケースを呼ぶ。
- 入力途中、モーダル表示、選択中のタブなど短命な状態はReactで管理する。
- 永続データの購読にはdexie-react-hooksの`useLiveQuery`相当を使用する。
- 大規模なグローバル状態管理ライブラリは導入しない。

### 5.3 Applicationレイヤー

画面とドメインをつなぐ処理を持つ。

主なユースケース:

- 現在のページをInboxへ追加する。
- 選択したタブを一括でInboxへ追加する。
- 未読アイテムを読書中にする。
- 未読アイテムを読了し、読書記録を作る。
- 現在のページを直接読了記録へ追加する。
- 過去に読んだページを再読として記録する。
- 未読アイテムを断念する。
- 読書記録を編集・削除する。
- ログを検索・絞り込みする。
- 全データをエクスポートする。
- バックアップを検証し、復元する。

### 5.4 Domainレイヤー

ブラウザやデータベースに依存しないルールを持つ。

主なルール:

- Inbox内では正規化URLの重複を許可しない。
- 読書記録は同じページに複数作成できる。
- 読了時には、現在の企画方針に基づく有効な振り返りを必要とする。
- 読了と同じトランザクションでInboxから対象を除く。
- 断念と削除を区別する。
- 日時は保存時にUTCのISO 8601形式へ正規化する。

### 5.5 Infrastructureレイヤー

- DexieによるIndexedDB実装。
- Chrome/WXT Browser APIによるタブ・権限・拡張ページ操作。
- JSONファイルの生成、ダウンロード、読み込み。
- 現在時刻とUUID生成の実装。

## 6. データ設計

### 6.1 テーブル構成

#### pages

ページ自体の共通情報を保持する。

| 項目 | 内容 |
| --- | --- |
| id | UUID |
| normalizedUrl | 重複判定用URL。一意インデックス |
| originalUrl | 取り込み時のURL |
| title | ページタイトル |
| siteName | ホスト名を基にしたサイト表示名 |
| createdAt | 初回登録日時 |
| updatedAt | ページ情報の最終更新日時 |

#### inboxItems

未読・読書中の状態を保持する。

| 項目 | 内容 |
| --- | --- |
| id | UUID |
| pageId | pagesへの参照。一意インデックス |
| status | unread / reading |
| source | current-tab / tab-import / bookmark-import / manual |
| reason | 読む理由。任意 |
| addedAt | Inbox登録日時 |
| startedAt | 読書開始日時。任意 |
| sortOrder | 将来の手動並び替え用。任意 |

#### readingEntries

一回ごとの読書記録を保持する。同じpageIdを複数行で参照できる。

| 項目 | 内容 |
| --- | --- |
| id | UUID |
| pageId | pagesへの参照 |
| reflection | 学び・感想・気づき等 |
| reflectionType | learning / impression / question / action / none 等。初期は任意 |
| completedAt | 読了日時 |
| createdAt | 記録作成日時 |
| updatedAt | 最終編集日時 |

#### dismissalEntries

読まないと判断した履歴を保持する。

| 項目 | 内容 |
| --- | --- |
| id | UUID |
| pageId | pagesへの参照 |
| reason | 断念理由。任意 |
| dismissedAt | 断念日時 |

#### settings

小さなユーザー設定と、データ形式に関する情報を保持する。

| 項目 | 内容 |
| --- | --- |
| key | 設定キー |
| value | 設定値 |

### 6.2 ページと読書記録を分離する理由

URLを1行のブックマークとして扱うと、再読時に以前の学びを上書きしてしまう。ページを共通情報、読書記録をイベントとして分離することで、同じページを複数回読んだ履歴と考えの変化を保持できる。

### 6.3 URL正規化

MVPでは安全性を優先し、限定的な正規化だけを行う。

- URLフラグメントを除去する。
- スキームとホスト名を小文字として扱う。
- 標準ポートを除去する。
- 末尾スラッシュを一貫させる。
- 明確なトラッキングパラメーター（`utm_*`等）だけを除去する。
- その他のクエリパラメーターはページ識別に必要な可能性があるため保持する。

正規化前のURLも保持し、ユーザーが開くときは原則としてoriginalUrlを使用する。

### 6.4 削除方針

- Inboxからの単純削除と断念を分ける。
- 読書記録を削除しても、同じページを参照する他の記録があればpagesは残す。
- どのInbox・読書・断念記録からも参照されないpagesは、クリーンアップ対象にできる。
- 全データ削除は明示的な確認を要求する。

### 6.5 スキーママイグレーション

DexieのDBバージョンを単調増加させ、既存データを破壊する変更を避ける。

- 各変更は旧バージョンからの移行処理を持つ。
- 本番公開後にテーブル名や主キーを安易に変更しない。
- マイグレーション前後のバックアップ復元テストを用意する。
- アプリのバージョンとDBスキーマバージョンを別に管理する。

## 7. 永続化方式

### 7.1 IndexedDBを使用するデータ

- ページ。
- Inboxアイテム。
- 読書記録。
- 断念記録。
- 検索対象となるユーザー入力。
- 設定と内部メタデータ。

### 7.2 Chrome Storageとの使い分け

MVPでは主要データをIndexedDBへ集約する。Chrome Storageは、必要になった場合に限り次の小さな情報へ使用する。

- 初回ガイド表示済みフラグ。
- 任意権限を説明した状態。
- 将来の端末同期対象となるごく小さな設定。

Chrome StorageとIndexedDBに同じデータを二重保存しない。

### 7.3 検索

MVPの想定件数では、IndexedDBから対象レコードを取得し、タイトル、URL、サイト名、reflectionをアプリケーション側で部分一致検索する。

全文検索ライブラリは導入しない。数千〜数万件規模で性能問題が計測された場合に、MiniSearch等のローカルインデックスを別ADRで検討する。

## 8. バックアップ・復元設計

### 8.1 バックアップ形式

JSONは次の単位を持つ。

- formatName
- schemaVersion
- appVersion
- exportedAt
- pages
- inboxItems
- readingEntries
- dismissalEntries
- settings

### 8.2 エクスポート

- ブラウザ上でJSONを生成し、ユーザー操作でファイル保存する。
- 外部サーバーへ送信しない。
- ファイル名にプロダクト名と出力日を含める。
- エクスポート前に整合性チェックを行う。

### 8.3 インポート

- ファイル内容を`unknown`として受け取り、Zodで検証する。
- schemaVersionに応じてバックアップ形式を移行する。
- 復元前に件数と対象をプレビューする。
- 初期版では「全置換」を基本とし、将来必要なら「マージ」を追加する。
- 検証失敗時は既存データを変更しない。
- 全置換は一つのトランザクションとして扱い、途中状態を残さない。

### 8.4 将来のGoogleバックアップ

Google Drive等へのバックアップはMVP外とする。導入する場合も、既存のJSON形式をそのまま運搬し、クラウド固有のデータモデルへ依存させない。認証・同期競合・暗号化・ストア権限を別ADRで検討する。

## 9. ブラウザ権限設計

### 9.1 初期インストール時の権限

候補:

- `activeTab`: ユーザーが拡張機能を操作した現在タブのURLとタイトルを取得する。
- `storage`: 小さな設定にChrome Storageを使う場合のみ要求する。

IndexedDB自体には拡張権限は不要である。

### 9.2 実行時に要求する任意権限

- `tabs`: 開いている複数タブのタイトル、URL、状態を一覧取得するとき。
- `bookmarks`: P1でChromeブックマークを取り込むとき。

任意権限は、対応機能の説明画面からユーザー操作で要求する。拒否された場合も、現在ページの個別登録と既存ログの利用は継続できるようにする。

### 9.3 要求しない権限

- `<all_urls>`等のhost permissions。
- `scripting`。
- `history`。
- `webNavigation`。
- `downloads`。通常のBlobダウンロードで足りる限り使用しない。
- `identity`。クラウドバックアップ導入までは不要。
- `unlimitedStorage`。実測で必要になるまで要求しない。

### 9.4 権限説明

ストア説明、初回ガイド、プライバシーポリシーで次を明記する。

- タブ情報は、ユーザーが選択したページをInboxへ登録するために使う。
- ページ本文は読み取らない。
- 閲覧履歴を自動収集しない。
- データを外部へ送信しない。
- 任意権限を拒否しても基本機能は利用できる。

## 10. UI技術設計

### 10.1 React

Popup、Dashboard、読了入力、一覧、検索、確認ダイアログをコンポーネント化するためReactを採用する。TypeScriptと組み合わせ、Propsとイベントを型で明示する。

### 10.2 状態管理

- 永続状態: DexieとRepository。
- DB購読: dexie-react-hooks。
- 画面内状態: ReactのuseState、useReducer、Context。
- URLで保持すべきDashboardの表示状態: URLSearchParamsまたはハッシュ。

ZustandやReduxはMVPでは採用しない。複数画面で複雑な一時状態を共有する必要が生じた場合のみ再検討する。

### 10.3 画面遷移

Dashboardは単一のHTMLエントリーポイントとし、Inbox、Log、Settingsを内部ナビゲーションで切り替える。React Routerは初期導入せず、ブラウザの戻る操作や直接リンクが必要になった時点で検討する。

### 10.4 スタイル

- CSS Modulesでコンポーネントのスタイルを分離する。
- 色、余白、フォント、角丸等はCSS Custom Propertiesでデザイントークン化する。
- 外部フォントをネットワーク取得しない。
- UIコンポーネントライブラリは初期導入しない。
- OSのライト／ダーク設定に追従できる構造にする。

### 10.5 アクセシビリティ

- ネイティブHTML要素を優先する。
- キーボードだけで主要操作を完了できる。
- フォーカス表示を消さない。
- ダイアログのフォーカス管理とEscape動作をテストする。
- 色だけに状態の意味を持たせない。
- 未読件数や状態変化を適切なテキストでも伝える。

## 11. フォルダ構成

WXTの`srcDir`を使用し、ソースコードを`src/`へまとめる。

```text
yomiato/
├─ .github/
│  └─ workflows/
│     └─ ci.yml
├─ docs/
│  ├─ product-plan.md
│  ├─ technical-design.md
│  └─ adr/
│     └─ README.md
├─ public/
│  ├─ icon-16.png
│  ├─ icon-32.png
│  ├─ icon-48.png
│  └─ icon-128.png
├─ src/
│  ├─ entrypoints/
│  │  ├─ background.ts
│  │  ├─ popup/
│  │  │  ├─ index.html
│  │  │  ├─ main.tsx
│  │  │  └─ PopupApp.tsx
│  │  └─ dashboard/
│  │     ├─ index.html
│  │     ├─ main.tsx
│  │     └─ DashboardApp.tsx
│  ├─ application/
│  │  ├─ use-cases/
│  │  ├─ dto/
│  │  └─ errors/
│  ├─ domain/
│  │  ├─ entities/
│  │  ├─ values/
│  │  ├─ services/
│  │  └─ ports/
│  ├─ infrastructure/
│  │  ├─ db/
│  │  │  ├─ schema/
│  │  │  ├─ migrations/
│  │  │  └─ repositories/
│  │  ├─ browser/
│  │  └─ backup/
│  ├─ features/
│  │  ├─ capture/
│  │  ├─ tab-import/
│  │  ├─ inbox/
│  │  ├─ completion/
│  │  ├─ reading-log/
│  │  └─ settings/
│  ├─ components/
│  ├─ hooks/
│  ├─ styles/
│  └─ shared/
│     ├─ constants/
│     ├─ types/
│     └─ utils/
├─ tests/
│  ├─ e2e/
│  ├─ fixtures/
│  └─ setup/
├─ .nvmrc
├─ eslint.config.js
├─ package.json
├─ package-lock.json
├─ playwright.config.ts
├─ prettier.config.js
├─ tsconfig.json
├─ vitest.config.ts
└─ wxt.config.ts
```

### 11.1 配置ルール

- `entrypoints/`にはWXTがビルド入口として認識するファイルだけを置く。
- ドメインルールは`domain/`に置き、ReactやDexieをimportしない。
- ブラウザAPIは`infrastructure/browser/`のGateway経由で利用する。
- DBアクセスは`infrastructure/db/repositories/`へ閉じ込める。
- 機能固有UIは`features/`、複数機能で共有するUIは`components/`へ置く。
- 汎用化を先回りしすぎず、2か所以上で実際に共有されたものだけ`shared/`へ移す。
- 単体テストは対象ファイルの近く、E2Eと共通fixtureは`tests/`へ置く。

## 12. エラー設計

ユーザーが対処できるエラーと、内部エラーを区別する。

### 12.1 ユーザー向けエラー

- 任意権限が拒否された。
- URLを登録できない特殊ページだった。
- すでにInboxへ登録されている。
- バックアップ形式が不正または未対応だった。
- 復元対象に矛盾がある。
- ストレージ操作に失敗した。

### 12.2 エラー処理方針

- 予期される失敗は型付きのApplication Errorとして返す。
- UIはエラーコードを日本語メッセージへ変換する。
- 生の例外やスタックトレースをユーザーへ表示しない。
- データ変更を伴う操作は、失敗時に途中状態を残さない。
- テレメトリーを送らないため、任意でコピーできる診断情報を将来用意する。

## 13. セキュリティ・プライバシー

### 13.1 ネットワーク

MVPのアプリケーションコードは外部ネットワーク通信を行わない。外部画像やフォントも読み込まない。

### 13.2 Content Security Policy

Manifest V3とChromeウェブストアの要件に従い、実行コードを拡張機能パッケージへ含める。`eval`、インラインスクリプト、リモートコードを使用しない。

### 13.3 表示データ

- ページタイトルやユーザー入力をHTMLとして挿入しない。
- Reactの通常のテキストエスケープを維持する。
- 将来Markdownを導入する場合は、別途サニタイズ方針を定める。

### 13.4 機密性

ローカル保存は暗号化を意味しない。Chromeプロファイルへアクセスできるユーザーやソフトウェアから完全に保護するものではないことを説明する。MVPでは独自暗号化やパスワードロックは実装しない。

### 13.5 プライバシーポリシー

公開前に、少なくとも次を記載する。

- 収集・保存するデータ。
- 保存場所。
- 外部送信の有無。
- 権限の目的。
- バックアップと削除方法。
- 問い合わせ窓口。

## 14. テスト戦略

### 14.1 単体テスト

Vitestで、ブラウザやReactに依存しないロジックを優先してテストする。

- URL正規化。
- Inbox重複判定。
- 状態遷移。
- 読了と再読。
- 断念と削除の違い。
- 日時・IDの扱い。
- バックアップ形式の検証と移行。

### 14.2 Repository結合テスト

fake-indexeddbを使用し、Dexie Repositoryとトランザクションをテストする。

- ページとInboxの同時保存。
- 読了時のreadingEntries追加とInbox削除。
- 途中失敗時のロールバック。
- DBスキーママイグレーション。
- 全置換復元。

### 14.3 UIテスト

Testing Libraryで、実装詳細ではなくユーザー操作と表示結果を検証する。

- 現在ページの状態表示。
- 未読登録。
- 読了入力のバリデーション。
- 検索と空状態。
- 権限拒否時の代替導線。
- バックアップ復元の確認画面。

### 14.4 E2Eテスト

Playwrightでビルド済み拡張をChromiumのpersistent contextへ読み込み、実ブラウザに近いフローを確認する。

必須シナリオ:

1. 拡張機能を読み込む。
2. ページをInboxへ登録する。
3. Dashboardで未読を確認する。
4. 振り返りを入力して読了する。
5. Inboxから消え、Logへ表示される。
6. ブラウザコンテキストを再起動してもデータが残る。
7. 同じページを再読として記録できる。
8. JSONを出力し、初期化後に復元できる。

### 14.5 手動確認

- `chrome://`ページ、Chromeウェブストア、PDF、ローカルファイル等の登録不可・制限ケース。
- 多数タブ選択時の操作。
- 任意権限の許可・拒否・取消。
- ライト／ダークテーマ。
- キーボード操作。
- Chromeウェブストアへ提出するパッケージ内容。

## 15. 開発ツールと品質ゲート

### 15.1 Node.jsと依存関係

- 実装開始時点のActive LTS版Node.jsを`.nvmrc`へ固定する。
- npmを使用し、`package-lock.json`をコミットする。
- 依存関係は正確なロックファイルで再現する。
- 自動的なメジャーバージョン更新を行わない。

### 15.2 TypeScript

- `strict`を有効にする。
- 原則として`any`を使用しない。
- 外部入力は`unknown`から検証する。
- 型アサーションはブラウザAPI境界等、根拠を説明できる場所へ限定する。

### 15.3 必須コマンドの役割

実装時に次の品質チェックを用意する。

- format: コード整形。
- lint: ESLint。
- typecheck: TypeScript型検査。
- test: 単体・結合テスト。
- test:e2e: 拡張E2Eテスト。
- build: Chrome向け本番ビルド。
- zip: ストア提出用アーカイブ生成。

### 15.4 CI

Pull Requestとmainブランチ更新時に次を実行する。

1. 依存関係のクリーンインストール。
2. フォーマット差分確認。
3. Lint。
4. TypeScript型検査。
5. 単体・結合テスト。
6. Chrome向け本番ビルド。
7. 主要E2Eテスト。

公開用アーカイブは、すべての品質ゲートを通過したタグから生成する。

## 16. ビルド・リリース

### 16.1 バージョン

Semantic Versioningを基本とする。

- patch: 不具合修正、互換性を保つ小変更。
- minor: 互換性を保つ機能追加。
- major: 利用方法やデータ形式に大きな変更がある場合。

DBスキーマバージョンはアプリバージョンと独立して管理する。

### 16.2 環境

- development: HMRと未圧縮出力。
- production: Chromeウェブストア提出用。
- E2E: テスト用設定と分離したブラウザプロファイル。

MVPでは外部APIキーやサーバーURLを持たないため、秘密情報は原則存在しない。

### 16.3 公開手順

初回は自動公開せず、次を手動で確認する。

1. バージョンと変更履歴を更新する。
2. 全品質ゲートを実行する。
3. WXTでproduction buildとZIPを生成する。
4. ZIP内容に開発用ファイルや不要な権限がないことを確認する。
5. 手動でChromeウェブストアへアップロードする。
6. ストア説明、プライバシー申告、権限説明を確認する。
7. 公開後にクリーンなChromeプロファイルへインストールして確認する。

公開作業が安定した後にのみ自動アップロードを検討する。

## 17. 観測性とサポート

### 17.1 テレメトリー

MVPでは解析SDK、クラッシュ送信、行動追跡を導入しない。ローカルファーストと外部送信なしの説明を単純に保つためである。

### 17.2 診断

必要になった場合は、ユーザーが自分で確認・コピーできる診断情報を提供する。

- アプリバージョン。
- DBスキーマバージョン。
- レコード件数。
- 付与済み任意権限。
- 直近のローカルエラー。ページURLやreflectionを含めない。

### 17.3 フィードバック

公開時はGitHub Issues等の窓口をREADMEとストア説明へ記載する。個人データを含むバックアップファイルを添付しないよう案内する。

## 18. ADR

### ADR-001: TypeScript + React + WXTを採用する

- ステータス: Accepted
- 決定: Manifest V3拡張をTypeScript、React、WXTで構築する。
- 理由: 型安全、複数UIエントリーポイント、開発時HMR、Manifest生成、将来の他ブラウザ対応を一つの構成で扱える。
- 却下案: 素のJavaScript、HTMLのみ、Viteを直接設定、Plasmo。
- トレードオフ: WXTへの依存と、1.0未満の変更リスクがある。DomainとBrowser GatewayをWXT非依存に保ち、移行可能性を残す。

### ADR-002: バックエンドとアカウントを作らない

- ステータス: Accepted
- 決定: MVPではサーバー、認証、クラウドDBを持たない。
- 理由: プロダクトのプライバシー価値とMVP範囲に一致する。
- トレードオフ: 自動同期、遠隔バックアップ、利用分析ができない。

### ADR-003: IndexedDB + Dexieを採用する

- ステータス: Accepted
- 決定: 主要データをIndexedDBへ保存し、Dexieでスキーマ・トランザクション・マイグレーションを管理する。
- 理由: 複数テーブル、インデックス、長期的なログ蓄積、原子的な状態遷移が必要である。
- 却下案: localStorage、Chrome Storageのみ、SQLite/WASM。
- トレードオフ: バックアップとテストの設計が必要。ブラウザ外から直接読めない。

### ADR-004: ページと読書イベントを分離する

- ステータス: Accepted
- 決定: pagesとreadingEntriesを別テーブルにする。
- 理由: 同じページの再読と、時間による学びの変化を記録するため。
- 却下案: URLごとに一つのメモを上書きする。

### ADR-005: DBアクセスをService Workerへ集中させない

- ステータス: Accepted
- 決定: PopupとDashboardはRepository経由でIndexedDBへアクセスできる。
- 理由: Manifest V3 Service Workerの停止を前提にし、不要なメッセージングと単一障害点を避ける。
- トレードオフ: 複数コンテキストからの同時更新を、DBトランザクションと一意制約で処理する必要がある。

### ADR-006: Popup + Dashboardを採用する

- ステータス: Accepted
- 決定: Popupをクイック操作、Dashboardを管理・入力・検索へ使う。
- 理由: Popupは短命で表示領域が小さく、管理画面には不向きである。
- 却下案: Popupのみ、Side Panelのみ、外部Webアプリ。

### ADR-007: タブとブックマーク権限を任意要求する

- ステータス: Accepted
- 決定: 基本機能は最小権限で動かし、複数タブ・ブックマーク取り込み時に追加権限を要求する。
- 理由: インストール時の警告を減らし、ユーザーの選択と説明可能性を高める。
- トレードオフ: 初回一括取り込み時に権限説明と追加操作が発生する。

### ADR-008: Content Scriptを使用しない

- ステータス: Accepted
- 決定: MVPではWebページ内へコードを挿入しない。
- 理由: 本文保存、ハイライト、ページ上メモは製品スコープ外である。
- 効果: host permissionsとページ内容アクセスを避けられる。

### ADR-009: バックアップをバージョン付きJSONとする

- ステータス: Accepted
- 決定: Zodで検証可能なJSON形式を正式なポータブルデータ形式とする。
- 理由: 人間にも機械にも扱いやすく、将来のGoogle Drive等へそのまま運べる。
- トレードオフ: 大規模データではファイルが大きくなるが、本文を保存しない本製品では許容できる。

### ADR-010: VitestとPlaywrightでテストを分担する

- ステータス: Accepted
- 決定: ドメイン・Repository・UIはVitest系、実拡張フローはPlaywrightで確認する。
- 理由: 高速な日常テストと、Chrome APIを含むE2Eの両方が必要である。
- トレードオフ: E2E実行環境のセットアップと保守が必要。

### ADR-011: MVPではテレメトリーを導入しない

- ステータス: Accepted
- 決定: 外部分析・クラッシュ送信SDKを入れない。
- 理由: 外部送信なしという価値を守り、プライバシー説明を単純にする。
- トレードオフ: 利用状況と障害を自動把握できない。初期は任意のフィードバックで補う。

## 19. 未決ADR

次の項目は実装または検証結果を踏まえて別ADRで決める。

1. 読了時reflectionを完全必須にするか。
2. 断念履歴を常に保持するか、設定可能にするか。
3. ブックマーク取り込みを公開初版へ含めるか。
4. Side Panelを追加するか。
5. 全文検索エンジンを導入するか。
6. Google Drive等へのバックアップを導入するか。
7. Chrome Storage Syncを設定同期へ利用するか。
8. 英語UIとFirefox対応をどの段階で行うか。
9. 任意の匿名テレメトリーを将来提供するか。

## 20. 実装開始前チェックリスト

- 企画書のMVP範囲と本書のP0機能が一致している。
- Node.js、WXT、React、Dexie等の採用時バージョンを確定しロックする。
- 最小Manifest権限を実機で確認する。
- PopupとDashboardのワイヤーフレームを確定する。
- DBスキーマv1とバックアップschemaVersion 1を確定する。
- 読了時の振り返り必須条件を決める。
- タブ一括取り込みの権限要求UXを確認する。
- テスト用fixtureとE2Eブラウザプロファイル方針を決める。
- Chromeウェブストア公開に必要なプライバシー説明の下書きを作る。

## 21. 参考資料

- [Chrome Extensions: Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Chrome Extensions: Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Chrome Extensions: Add a popup](https://developer.chrome.com/docs/extensions/develop/ui/add-popup)
- [WXT: Introduction](https://wxt.dev/guide/introduction.html)
- [WXT: Project Structure](https://wxt.dev/guide/essentials/project-structure.html)
- [WXT: Entrypoints](https://wxt.dev/guide/essentials/entrypoints.html)
- [WXT: Manifest](https://wxt.dev/guide/essentials/config/manifest.html)
- [React: Using TypeScript](https://react.dev/learn/typescript)
- [Dexie: TypeScript](https://dexie.org/docs/Typescript)
- [Zod: Basic usage](https://zod.dev/basics)
- [Vitest: Getting Started](https://vitest.dev/guide/)
- [Playwright: Chrome extensions](https://playwright.dev/docs/chrome-extensions)

