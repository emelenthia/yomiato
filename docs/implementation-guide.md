# よみあと（Yomiato）MVP実装手順書

- 文書ステータス: 初版
- 作成日: 2026-08-10
- 対象: Chrome拡張機能の個人利用可能なMVP
- 想定読者: 実装を担当するAIエージェント、または本プロジェクトへ初めて参加する開発者
- 上位文書: [企画・開発計画書](product-plan.md)、[技術設計書・ADR](technical-design.md)

## 1. この文書の目的

本書は、実装担当者が追加の設計判断をできるだけ行わず、決められた順序でMVPを実装するための作業指示書である。

各工程には、次を記載する。

- 実装する範囲。
- 作成・変更する主なファイル。
- 守るべき仕様。
- 必須テスト。
- 工程の完了条件。

本書は具体的なソースコードを提供しない。実装担当者は、ここに記載した契約、状態遷移、画面挙動、テスト条件を満たすコードを作成する。

## 2. 文書の優先順位

仕様が競合して見える場合は、次の順序で判断する。

1. 本書の「MVP固定仕様」と各工程の完了条件。
2. 技術設計書でAcceptedとなっているADR。
3. 企画・開発計画書のP0要件とMVP完了条件。
4. 各ライブラリとChrome Extensionsの公式ドキュメント。

上記だけで決められない場合、推測して機能を追加しない。未決事項として作業報告に記録し、その工程を止める。ただし、見た目の微調整、変数名、テストデータ等、外部仕様へ影響しない判断は実装担当者が行ってよい。

## 3. 実装担当AIへの共通指示

### 3.1 作業開始時

1. `README.md`、`docs/product-plan.md`、`docs/technical-design.md`、本書をこの順で最後まで読む。
2. `git status --short`で既存変更を確認する。
3. ユーザーの既存変更を削除、上書き、巻き戻ししない。
4. 現在の工程と完了条件を短く宣言してから作業する。
5. 一度に複数工程を実装せず、工程ごとに検証する。

### 3.2 実装中の禁止事項

- 本書にない外部API、バックエンド、認証、解析SDKを追加しない。
- Content Script、host permissions、`<all_urls>`、リモートコードを追加しない。
- ページ本文、画像、選択テキスト、閲覧履歴を取得しない。
- Redux、Zustand、React Router、UIコンポーネントライブラリ、日付ライブラリ、全文検索ライブラリを追加しない。
- タグ、評価、統計、クラウド同期、ブックマーク取り込みをMVPへ追加しない。
- テストを通す目的で型検査、バリデーション、テストケースを弱めない。
- `any`、無根拠な型アサーション、握りつぶした例外を使わない。
- IndexedDBの既存データを消すことでマイグレーション問題を回避しない。
- ユーザーが依頼していないコミット、push、公開を行わない。

### 3.3 工程ごとの報告形式

各工程の終了時に、最低限次を報告する。

- 変更したファイル。
- 実装した挙動。
- 実行した検証コマンドと結果。
- 残っている警告、未決事項、手動確認項目。
- 次に着手できる工程番号。

失敗したチェックが一つでもある場合、その工程を完了扱いにしない。

## 4. MVP固定仕様

本節は、上位文書の未決事項についてMVP実装を進めるための暫定的な決定を示す。ここから変更する場合は、先に企画書またはADRを更新する。

### 4.1 MVPに含める

- 現在ページをInboxへ登録。
- 現在ページを直接読了として記録。
- 現在ウィンドウの複数タブを選択してInboxへ一括登録。
- Inboxの一覧、件数、元ページを開く操作。
- Inboxアイテムの読了、断念、単純削除。
- 一言の振り返り、または「得るものなし」による読了。
- 読書ログの一覧、検索、編集、削除、元ページを開く操作。
- 同じページの再読記録。
- JSONのエクスポート、検証付き全置換インポート。
- 確認操作付きの全データ削除。
- 保存データと権限の説明。
- ブラウザ再起動後のデータ保持。

### 4.2 MVPに含めない

- Chromeブックマーク取り込み。
- タグ、評価、「読む理由」、手動並び替え。
- アイコン上の未読件数バッジ。
- 期間・サイト・ステータスによる高度な絞り込み。
- Markdown、CSVエクスポート。
- 通知、ショートカット、リマインダー。
- Side Panel。
- Google Drive等へのバックアップ、同期。
- テレメトリー、クラッシュレポート。
- 英語UI、Firefox対応。

### 4.3 対応URL

- 保存対象は`http:`と`https:`だけとする。
- `chrome:`、`chrome-extension:`、`file:`、`data:`、`about:`等は保存しない。
- 対応外ページでは、登録ボタンを無効化し、理由を日本語で表示する。
- タブ一括取り込みでは対応外URLを選択不可にし、除外理由を表示する。

### 4.4 読了条件

読了保存には、次のどちらか一つを必要とする。

1. 前後の空白を除いた振り返りが1文字以上ある。
2. ユーザーが「得るものなし」を明示的に選択している。

両方ともない状態では保存できない。「得るものなし」の場合は`reflectionType = none`として保存し、画面上でもその選択が分かるようにする。空文字を通常の読了記録として保存しない。

### 4.5 断念と削除

- 断念: `dismissalEntries`へ履歴を保存したうえでInboxから除く。
- 単純削除: 履歴を作らずInboxから除く。
- 読書ログ削除: 対象の`readingEntries`だけを削除する。
- 参照されなくなった`pages`は、同じトランザクション内で削除してよい。

### 4.6 表示言語と日時

- MVPのUIは日本語のみ。
- 保存日時はUTCのISO 8601文字列。
- 表示日時はブラウザのローカルタイムゾーン。
- 表示書式は一つの共通関数へ集約する。

### 4.7 入力上限

予期しない巨大データを避けるため、MVPでは次を上限とする。

- URL: 16,384文字。超過時は保存しない。
- title: 1,000文字。外部ページから取得した値は末尾を切り詰める。
- reflection: 5,000文字。超過時は入力エラーとし、勝手に切り詰めない。
- 断念理由: 1,000文字。超過時は入力エラーとする。
- インポートするJSONファイル: 10 MiB。超過時は読み込まない。

同じ制約をDomain、Application、UIで別々の数値として持たず、共通定数から参照する。

## 5. 採用技術と依存関係

### 5.1 実行環境

- Node.js: 24系LTSを基準とし、`.nvmrc`へメジャーバージョンを記録する。
- パッケージ管理: npm。
- ロックファイル: `package-lock.json`を必ず保存する。
- ブラウザ: 実装時点のStable版Google Chromeを主対象とする。

### 5.2 本番依存

- `react`
- `react-dom`
- `dexie`
- `dexie-react-hooks`
- `zod`

WXTが生成する依存関係は維持する。新しい本番依存を追加する場合は、追加理由を先にADRへ記録する。

### 5.3 開発依存

- `wxt`
- `typescript`
- `vitest`
- `@testing-library/react`
- `@testing-library/user-event`
- `@testing-library/jest-dom`
- `jsdom`
- `fake-indexeddb`
- `@playwright/test`
- `eslint`
- `eslint-plugin-react-hooks`
- `eslint-plugin-jsx-a11y`
- `prettier`

TypeScript型定義やWXTテンプレートが必要とする補助依存は追加してよい。

### 5.4 バージョンの扱い

- 実装開始時点の安定版をnpmから取得する。
- プレリリース版、beta、canaryを使用しない。
- 実際に解決された正確なバージョンは`package-lock.json`で固定する。
- メジャーバージョンを変更するときは、全品質ゲートとデータ移行テストを実行する。

## 6. 最終フォルダ構成

技術設計書の構成を、MVPでは次の粒度で作成する。名前を無断で別構成へ置き換えない。

```text
yomiato/
├─ .github/workflows/ci.yml
├─ docs/
│  ├─ product-plan.md
│  ├─ technical-design.md
│  └─ implementation-guide.md
├─ public/
│  └─ icon-*.png
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
│  │  ├─ errors/
│  │  ├─ dto/
│  │  └─ use-cases/
│  ├─ domain/
│  │  ├─ entities/
│  │  ├─ values/
│  │  ├─ services/
│  │  └─ ports/
│  ├─ infrastructure/
│  │  ├─ backup/
│  │  ├─ browser/
│  │  └─ db/
│  │     ├─ migrations/
│  │     ├─ repositories/
│  │     └─ schema/
│  ├─ features/
│  │  ├─ capture/
│  │  ├─ completion/
│  │  ├─ inbox/
│  │  ├─ reading-log/
│  │  ├─ settings/
│  │  └─ tab-import/
│  ├─ components/
│  ├─ hooks/
│  ├─ shared/
│  │  ├─ constants/
│  │  ├─ types/
│  │  └─ utils/
│  └─ styles/
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

機能が小さい間は、空ディレクトリや中身のない`index.ts`を先に作らない。実ファイルが必要になった工程で作成する。

## 7. データ契約

### 7.1 ID

- 全レコードのIDはUUID文字列。
- 生成処理は`IdGenerator`ポートの背後へ置く。
- 本番実装はWeb Crypto APIのUUID生成機能を使う。
- テストでは固定値を返せる実装へ差し替える。

### 7.2 Page

| フィールド | 型・制約 |
| --- | --- |
| id | UUID、必須 |
| normalizedUrl | 対応URLを正規化した文字列、必須、一意 |
| originalUrl | 取得時のURL、必須 |
| title | 前後空白を除いた文字列、空ならホスト名へフォールバック |
| siteName | URLのhostname、必須 |
| createdAt | UTC ISO 8601、必須 |
| updatedAt | UTC ISO 8601、必須 |

### 7.3 InboxItem

| フィールド | 型・制約 |
| --- | --- |
| id | UUID、必須 |
| pageId | Pageへの参照、必須、一意 |
| status | `unread`または`reading` |
| source | `current-tab`または`tab-import`。将来用の値を勝手に保存しない |
| addedAt | UTC ISO 8601、必須 |
| startedAt | MVPでは未使用でもスキーマ上は任意 |

`reason`、`sortOrder`はMVP UIから保存しない。

`reading`は将来の状態として型とDBで許可するが、MVPでは状態変更UIを作らず、新規InboxItemは常に`unread`とする。

### 7.4 ReadingEntry

| フィールド | 型・制約 |
| --- | --- |
| id | UUID、必須 |
| pageId | Pageへの参照、必須、重複可 |
| reflection | ユーザー入力。`none`の場合は空文字を許可 |
| reflectionType | `learning`、`impression`、`question`、`action`、`none` |
| completedAt | UTC ISO 8601、必須 |
| createdAt | UTC ISO 8601、必須 |
| updatedAt | UTC ISO 8601、必須 |

通常入力の初期値は`impression`とする。UIで種類を必須選択させない。「得るものなし」のときだけ`none`を明示的に保存する。

### 7.5 DismissalEntry

| フィールド | 型・制約 |
| --- | --- |
| id | UUID、必須 |
| pageId | Pageへの参照、必須 |
| reason | 前後空白を除いた任意文字列 |
| dismissedAt | UTC ISO 8601、必須 |

### 7.6 Setting

| フィールド | 型・制約 |
| --- | --- |
| key | 一意の文字列 |
| value | Zodでキーごとに検証できるJSON互換値 |

MVPでは設定項目を無理に作らない。DB情報や将来用フラグを保存する必要が生じた場合だけ使用する。

### 7.7 URL正規化の厳密な順序

1. `URL`として解析する。解析不能なら`UNSUPPORTED_URL`。
2. protocolがHTTP/HTTPS以外なら`UNSUPPORTED_URL`。
3. protocolとhostnameを小文字として扱う。
4. HTTPの80番、HTTPSの443番を除去する。
5. fragmentを除去する。
6. pathnameが`/`より長い場合だけ末尾の`/`を除去する。
7. `utm_source`、`utm_medium`、`utm_campaign`、`utm_term`、`utm_content`、`utm_id`を大文字小文字を区別せず除去する。
8. その他のquery parameterは値と順序を保持する。
9. usernameとpasswordを含むURLは保存不可とする。

正規化処理は純粋関数にし、表形式の単体テストを作る。

### 7.8 IndexedDB v1

DB名は`yomiato`、初期スキーマバージョンは`1`とする。

必要なインデックス:

- `pages`: 主キー`id`、一意`normalizedUrl`、`createdAt`。
- `inboxItems`: 主キー`id`、一意`pageId`、`status`、`addedAt`。
- `readingEntries`: 主キー`id`、`pageId`、`completedAt`、`updatedAt`。
- `dismissalEntries`: 主キー`id`、`pageId`、`dismissedAt`。
- `settings`: 一意`key`。

テーブル名、主キー、インデックスはDBスキーマ定義の一か所へ集約する。

## 8. Applicationユースケース契約

ユースケースはReact、WXT、Chrome APIをimportしない。Repository、Clock、IdGenerator、Browser Gateway等のポートを引数またはコンストラクタで受け取る。

### 8.1 共通エラー

最低限、次の判別可能なエラーコードを用意する。

- `UNSUPPORTED_URL`
- `ALREADY_IN_INBOX`
- `PAGE_NOT_FOUND`
- `INBOX_ITEM_NOT_FOUND`
- `READING_ENTRY_NOT_FOUND`
- `REFLECTION_REQUIRED`
- `PERMISSION_DENIED`
- `INVALID_BACKUP`
- `UNSUPPORTED_BACKUP_VERSION`
- `STORAGE_FAILURE`

UIはエラーコードを日本語へ変換する。例外メッセージの文字列比較で分岐しない。

### 8.2 CapturePageToInbox

入力:

- URL。
- タイトル。
- source。

処理:

1. URLを検証・正規化する。
2. 同じnormalizedUrlのPageを検索する。
3. Pageがなければ作成し、あればoriginalUrl、title、siteName、updatedAtを更新する。
4. 同じpageIdのInboxItemがあれば`ALREADY_IN_INBOX`を返す。
5. InboxItemを作成する。
6. 2〜5を一つのトランザクションで行う。

出力:

- 作成されたPageとInboxItem。
- 既存の読書記録件数。Popupの状態表示に利用する。

### 8.3 ImportTabsToInbox

入力:

- ユーザーが選択したタブのURLとタイトルの配列。

処理:

- 各項目にCapturePageToInboxと同じ規則を適用する。
- 一項目の重複または対応外URLで全体を失敗させない。
- 追加対象ごとに独立したトランザクションを使用し、一件の予期しない失敗で成功済みの他項目を巻き戻さない。
- 結果を`added`、`duplicate`、`unsupported`、`failed`へ分類する。
- 同じ入力内の正規化URL重複もduplicateとして扱う。

出力:

- 分類ごとの件数と、各タブの結果。

### 8.4 CompleteInboxItem

入力:

- inboxItemId。
- reflection。
- noTakeaway選択状態。

処理:

1. 読了条件を検証する。
2. InboxItemとPageの存在を確認する。
3. ReadingEntryを新規作成する。
4. InboxItemを削除する。
5. 3〜4を一つのトランザクションで行う。

同じPageの過去のReadingEntryは上書きしない。

### 8.5 CompleteCurrentPage

Inbox経由ではない直接読了用。

- URLからPageを取得または作成する。
- 有効なReadingEntryを新規作成する。
- 同じPageがInboxに存在する場合は、同じトランザクションでInboxItemを削除する。
- 以前のReadingEntryがあっても新規行を追加する。

### 8.6 DismissInboxItem

- InboxItemとPageの存在を確認する。
- DismissalEntryを作成する。
- InboxItemを削除する。
- 二つの変更を同じトランザクションで行う。

### 8.7 DeleteInboxItem

- InboxItemだけを削除する。
- 同じPageを参照するReadingEntryまたはDismissalEntryがなければ、Pageも削除する。
- 確認ダイアログはUIの責務とし、ユースケース自体は明示的な呼び出しを実行する。

### 8.8 UpdateReadingEntry

- 対象が存在しなければ`READING_ENTRY_NOT_FOUND`。
- Completeと同じ読了条件を適用する。
- `completedAt`は変更せず、`updatedAt`を更新する。
- PageのURLやタイトルはこの操作では変更しない。

### 8.9 DeleteReadingEntry

- 対象のReadingEntryを削除する。
- 他の参照がないPageだけを同じトランザクションで削除する。
- 同じPageの他の読書記録を削除しない。

### 8.10 RecordReread

- 過去のReadingEntryを複製しない。
- Pageを引き継ぎ、新しい振り返りと現在日時でReadingEntryを作る。
- 読了条件は通常の読了と同じ。

### 8.11 SearchReadingLog

- title、originalUrl、siteName、reflectionを検索対象にする。
- 前後空白を除き、小文字化した検索語で大文字小文字を区別しない部分一致を行う。
- 空の検索語では全件を返す。
- 表示順はcompletedAtの降順。同時刻の場合はcreatedAt、idで安定化する。

### 8.12 読み取りユースケース

UIがRepositoryへ直接依存しないよう、最低限次の読み取り処理をApplicationへ用意する。

- `GetPageStatus`: URLを検証・正規化し、InboxItemの有無、過去のReadingEntry件数、Page情報を返す。
- `ListInbox`: Page情報を結合したInboxItemをaddedAt降順で返す。任意の検索語があればtitleとoriginalUrlを部分一致検索する。
- `ListReadingLog`: Page情報を結合したReadingEntryをSearchReadingLogの規則で返す。
- `GetReadingEntry`: 編集対象の一件とPage情報を返す。
- `GetDataSummary`: 各テーブル件数とDB schema versionを返す。

Dexieのlive queryから呼び出す場合も、並び順や検索規則をReactコンポーネントへ重複実装しない。

### 8.13 ExportBackup

- DBの全テーブルを読み取る。
- 参照整合性を検査する。
- `formatName = yomiato-backup`、`schemaVersion = 1`、appVersion、exportedAtを含むJSONを作る。
- エクスポート処理はDBを変更しない。

### 8.14 ImportBackup

- ファイル内容は`unknown`からZodで検証する。
- schemaはトップレベルと各レコードの未知フィールドを許可しないstrictな形式にする。
- formatNameとschemaVersionを検査する。
- 外部キー、重複ID、重複normalizedUrl、重複Inbox pageIdを検査する。
- 実行前に件数をUIへ返してプレビューする。
- ユーザー確認後、全テーブルを一つのトランザクションで全置換する。
- 一件でも失敗した場合、既存データを完全に維持する。

### 8.15 ClearAllData

- 全テーブルを一つのトランザクションで空にする。
- UIでプロダクト名の入力等、誤操作しにくい確認を行ってから呼ぶ。

### 8.16 依存関係の組み立て

- DIライブラリは導入しない。
- PopupとDashboardの各entrypointをcomposition rootとする。
- composition rootでDexie DB、Repository、Browser Gateway、Clock、IdGenerator、各ユースケースを生成する。
- ReactにはContextまたは明示的なPropsでApplicationサービスを渡す。
- テストでは同じポートへfakeまたはin-memory実装を渡す。
- entrypointをまたぐ可変singleton stateを作らない。共有状態はIndexedDBへ保存する。

## 9. UI共通仕様

### 9.1 状態

データを表示する画面は、最低限次の状態を個別に実装する。

- 初回読み込み中。
- データあり。
- 空状態。
- 操作中。
- 操作成功。
- ユーザーが対処可能なエラー。
- 予期しないエラー。

操作中は同じ操作を二重送信できないようにする。失敗時に成功表示を出さない。

### 9.2 アクセシビリティ

- iconだけのボタンにはアクセシブルな名前を付ける。
- form controlにはlabelを関連付ける。
- ダイアログを開いたら内部へフォーカスを移し、閉じたら起点へ戻す。
- Escapeでキャンセルできるようにする。ただし保存中は誤って閉じない。
- 成功・失敗メッセージはスクリーンリーダーにも通知する。
- Tabキーだけで主要フローを操作できるようにする。

### 9.3 外部ページを開く操作

- 保存済みoriginalUrlを新しいタブで開く。
- URLを再検証してからBrowser Gatewayへ渡す。
- ReactコンポーネントからChrome APIを直接呼ばない。

### 9.4 削除確認

- Inboxの単純削除、読書記録削除、全データ削除は確認を挟む。
- 断念は独立した肯定的な操作として表示し、削除という文言を使わない。
- 全データ削除は他の確認より強い操作にする。

## 10. 工程0: 作業環境とベースライン

### 作業

1. Gitの状態と既存ファイルを確認する。
2. Node.js 24系を使用し、`.nvmrc`を作る。
3. WXTの公式initializerでReact + TypeScript構成を用意する。本リポジトリは空ではないため、rootで直接initializerを実行しない。一時ディレクトリ内で`npx wxt@latest init`を実行し、対話では一時的なproject name、Reactテンプレート、npmを選ぶ。生成された設定、package、React entrypointを内容確認のうえ本リポジトリへ移し、既存のREADME、docs、`.git`を上書きしない。移した後に一時ディレクトリを削除する。
4. npmで依存関係を導入し、lockfileを生成する。
5. `srcDir`を`src`に設定する。
6. Chrome Manifest V3を対象にする。
7. npm scriptsとして`dev`、`build`、`zip`、`format`、`format:check`、`lint`、`typecheck`、`test`、`test:e2e`を用意する。
8. TypeScript strict、ESLint、Prettier、Vitest、jsdom、fake-indexeddb、Playwrightの設定を作る。

初期化後、本番依存は`npm install react react-dom dexie dexie-react-hooks zod`、不足する開発依存は本書5.3のpackage名を`npm install --save-dev`で追加する。initializerが既に導入したpackageを重複して指定しても、最終的な`package.json`に同じ目的のpackageを複数入れない。

### Manifest初期値

- name: よみあと
- description: 企画書の短い説明を基にする。
- permissions: `activeTab`。
- optional_permissions: `tabs`。
- host_permissions: なし。
- optional_host_permissions: なし。
- action: Popupを指定。

`storage`は実際にChrome Storageを使用するまで追加しない。

### 必須確認

- 開発ビルドが生成できる。
- 本番ビルドとZIPが生成できる。
- Chromeの「パッケージ化されていない拡張機能を読み込む」で読み込める。
- PopupとDashboardの仮画面が開く。
- Manifestに予定外の権限がない。
- format、lint、typecheck、testが成功する。

### 完了条件

機能が空でも、全品質コマンドとChromeへの読み込みが成功している。

## 11. 工程1: Domainと共通値

### 主な配置

- `src/domain/entities/`
- `src/domain/values/`
- `src/domain/services/`
- `src/domain/ports/`
- `src/application/errors/`
- 対応する単体テスト。

### 作業

1. Page、InboxItem、ReadingEntry、DismissalEntryの型を定義する。
2. URL検証・正規化を純粋関数として作る。
3. 読了条件の検証を純粋関数として作る。
4. Clock、IdGenerator、各Repositoryのポートを定義する。
5. 共通Application Errorを定義する。
6. UTC日時、表示日時、文字列trim等の共通処理を分離する。

### 必須テスト

- URL正規化の各手順と境界値。
- 対応外scheme、解析不能URL、認証情報付きURL。
- tracking parameterだけが除去されること。
- reflectionあり、空白のみ、noTakeawayあり／なしの全組み合わせ。
- ClockとIdGeneratorを固定値へ差し替えられること。

### 完了条件

Domain配下がReact、Dexie、WXT、Chrome APIをimportせず、全単体テストが成功する。

## 12. 工程2: IndexedDBとRepository

### 主な配置

- `src/infrastructure/db/schema/`
- `src/infrastructure/db/migrations/`
- `src/infrastructure/db/repositories/`
- Repository結合テスト。

### 作業

1. Dexie DBクラスとv1スキーマを作る。
2. 全RepositoryポートのDexie実装を作る。
3. 複数テーブル操作用のトランザクション境界を用意する。
4. PageのnormalizedUrl一意制約とInboxItemのpageId一意制約をDBでも保証する。
5. 参照されないPageを判定する処理を作る。
6. fake-indexeddbをテスト環境で初期化する。
7. テストごとに一意のDB名を使い、終了時に閉じる。

### 必須テスト

- 全テーブルの作成、取得、更新、削除。
- 一意制約違反。
- Pageが複数ReadingEntryを持てること。
- トランザクション途中の例外で全変更が戻ること。
- DBを再度開いてもデータが残ること。
- v1スキーマを空DBと既存fixtureの両方で開けること。

### 完了条件

Repository結合テストが成功し、UIやService Workerなしで永続化契約を検証できる。

## 13. 工程3: Applicationユースケース

### 主な配置

- `src/application/use-cases/`
- `src/application/dto/`
- 各ユースケースの単体・結合テスト。

### 実装順

1. CapturePageToInbox。
2. ImportTabsToInbox。
3. CompleteInboxItem。
4. CompleteCurrentPage。
5. DismissInboxItem。
6. DeleteInboxItem。
7. UpdateReadingEntry。
8. DeleteReadingEntry。
9. RecordReread。
10. SearchReadingLog。
11. GetPageStatus、ListInbox、ListReadingLog、GetReadingEntry、GetDataSummary。
12. ExportBackup。
13. ImportBackupの検証、プレビュー、実行。
14. ClearAllData。

### 必須テスト

- 本書8章の各処理順と出力。
- 現在ページの重複登録。
- 並行する二つの登録要求でもInboxが一件だけになること。
- Inbox読了時にReadingEntryだけ残ること。
- 直接読了時に既存Inboxが除去されること。
- 再読で過去記録が変化しないこと。
- 断念と単純削除で履歴が異なること。
- 読み取りユースケースの結合結果、並び順、空状態。
- 検索対象、大小文字、空検索、表示順。
- 不正バックアップでDBが一切変化しないこと。
- 正常バックアップの往復で全データが一致すること。

### 完了条件

すべてのMVPデータ操作がUIなしで実行・検証できる。

## 14. 工程4: Browser Gatewayと権限

### 主な配置

- `src/infrastructure/browser/`
- Browser Gatewayの単体テスト。

### 必要なGateway

- 現在のactive tabからid、URL、titleを取得する。
- 現在ウィンドウのタブ一覧を取得する。
- `tabs`任意権限の有無を確認する。
- ユーザー操作を起点に`tabs`権限を要求する。
- Dashboardを新しいタブで開く。
- 保存済みURLを新しいタブで開く。
- app versionを取得する。
- JSON Blobをブラウザの通常ダウンロードとして保存する。
- File入力から文字列を読み込む。

### 権限フロー

1. 一括取り込みボタンをユーザーが押す。
2. 現在の権限を確認する。
3. 未付与なら、必要な理由を画面に表示する。
4. ユーザーが続行を押した直接のイベント内で権限を要求する。
5. 拒否されたら`PERMISSION_DENIED`として扱い、個別登録は引き続き利用可能にする。

### 必須テスト

- Chrome APIをmockし、正常、情報欠落、権限拒否、API例外を検証する。
- URLまたはtitleがundefinedのタブを安全に扱う。
- 対応外URLをApplicationへ渡さない、または明示的なunsupported結果にする。
- ReactコンポーネントがChrome APIを直接importしていないことを確認する。

### 完了条件

ブラウザ依存処理がGateway内に閉じ、権限拒否でも基本機能が壊れない。

## 15. 工程5: Dashboardの骨格

### 主な配置

- `src/entrypoints/dashboard/`
- `src/components/`
- `src/styles/`
- 必要な共通hooks。

### 画面構造

Dashboardは一つのHTML entrypointとし、次の3ビューを内部ナビゲーションで切り替える。

- Inbox。
- 読書ログ。
- 設定・データ管理。

URLのqueryまたはhashで現在ビューを表現し、リロード後も同じビューを開けるようにする。React Routerは使わない。

### 作業

1. アプリ全体のレイアウト、見出し、ナビゲーションを作る。
2. CSS Custom Propertiesへ色、余白、文字サイズ、角丸を定義する。
3. ライト／ダーク配色をOS設定へ追従させる。
4. Button、Dialog、EmptyState、ErrorMessage、Loading等、実際に複数画面で使う共通部品だけを作る。
5. 各ビューに空状態を表示する。
6. 予期しないUI例外が全面白画面にならない境界を用意する。

### 必須テスト

- ナビゲーション切り替え。
- URL状態の復元。
- キーボード操作とフォーカス表示。
- 各ビューの空状態。

### 完了条件

実データ操作前のDashboardをChromeから開け、3ビューを操作できる。

## 16. 工程6: Popupと現在ページ登録

### 主な配置

- `src/entrypoints/popup/`
- `src/features/capture/`

### Popup表示

- 現在ページのタイトルとsiteName。
- 「後で読む」ボタン。
- 「読了として記録」ボタン。
- Inbox登録済み状態。
- 過去の読了回数がある場合の状態。
- 対応外ページの説明。
- 「よみあとを開く」Dashboard導線。

### 挙動

- Popupを開いたらactive tabを一度取得し、その情報で状態を照合する。
- Inbox登録成功時は「追加しました。このタブを閉じても大丈夫です」等の明確な成功表示を出す。
- タブを自動で閉じない。
- 重複時はエラー調にせず「すでに後で読むにあります」と表示する。
- 読了ボタンはDashboardの読了入力へ遷移する。遷移先は`view=complete`と、`URLSearchParams`でエンコードしたurl・titleをqueryへ持つ拡張機能内URLとする。Dashboardは値を読み取った直後にURLとtitleを再検証して画面内stateへ保持し、`history.replaceState`でqueryからurl・titleを除去する。不正な値では入力画面を開かない。reflectionをPopup内で長く入力させない。

### 必須テスト

- 未登録、Inbox登録済み、読了歴あり、両方あり、対応外URL。
- 登録成功、重複、ストレージ失敗。
- 連打しても一件だけ登録される。
- Dashboard導線と直接読了導線。

### 完了条件

一般WebページをPopupからInboxへ登録し、Dashboardで確認できる。

## 17. 工程7: 複数タブ取り込み

### 主な配置

- `src/features/tab-import/`
- Dashboard内のタブ取り込み画面またはダイアログ。

### 画面

- 権限が必要な理由。
- 現在ウィンドウのタブ一覧。
- タイトル、siteName、登録状態。
- 個別checkbox、すべて選択／解除。
- 対応外と重複の選択不可表示。
- 選択件数と「Inboxへ追加」。
- 実行後のadded、duplicate、unsupported、failed件数。

### 挙動

- 拡張自身のPopup/Dashboard、chrome内部ページは選択不可。
- 初期状態で対応可能かつ未登録のタブを選択する。
- 選択ゼロでは実行ボタンを無効にする。
- 成功後も失敗項目を確認できる。
- タブを自動で閉じない。

### 必須テスト

- 権限許可、拒否、既に許可済み。
- 混在したタブ一覧。
- 入力内重複と既存Inbox重複。
- 部分成功。
- 連打防止。

### 完了条件

複数タブを選んで一括登録でき、拒否や一部失敗をデータ損失なく説明できる。

## 18. 工程8: Inbox

### 主な配置

- `src/features/inbox/`
- `src/features/completion/`

### 一覧表示

- 未読件数。
- addedAt降順のアイテム。
- タイトル、siteName、登録日。
- 元ページを開く。
- 読了、断念、削除。
- 一覧内の単純なタイトル／URL検索。

### 読了ダイアログまたは画面

- ページタイトル。
- 「一言でOK」という説明。
- 振り返りtextarea。
- 入力例: 学んだこと、気づいたこと、面白かったこと、まだ分からないこと、次に試したいこと。
- 「得るものなし」checkboxまたは選択肢。
- 保存、キャンセル。

noTakeawayを選んだときのreflection入力値は勝手に消さない。両方が存在する場合は、保存前にどちらを記録するかが明確になるUIにする。

### 断念

- 断念は削除と別ボタン。
- 任意理由を入力できる簡単な確認画面。
- 完了後は罪悪感をあおらない中立的な成功表示。

### 必須テスト

- 並び順、件数、空状態、検索。
- 読了条件の全組み合わせ。
- 読了後にInboxから消えLogへ追加される。
- 読了トランザクション失敗時にInboxへ残る。
- 断念履歴と単純削除の差。
- 外部ページを開く操作。

### 完了条件

Inboxの各アイテムを、読了・断念・削除のいずれかで安全に処理できる。

## 19. 工程9: 読書ログ

### 主な配置

- `src/features/reading-log/`
- `src/features/completion/`の再利用可能な入力部品。

### 一覧表示

- completedAt降順。
- reflectionまたは「得るものなし」を視覚的な主情報として表示。
- タイトル、siteName、読了日時。
- 元ページを開く。
- 編集、削除、再読を記録。
- title、URL、siteName、reflectionの検索。

### 編集

- 既存reflectionとnoTakeaway状態を初期表示する。
- 読了条件を再適用する。
- completedAtは変えない。
- 成功後に更新内容が一覧へ反映される。

### 再読

- 同じPageに新しいReadingEntryを追加する。
- 過去のreflectionを入力欄へ自動コピーしない。
- 新しい読了日時を使う。
- 保存後、同じページの複数記録が一覧に存在する。

### 必須テスト

- 表示順と同時刻の安定順。
- 全検索対象と大文字小文字。
- 編集成功、バリデーション失敗、保存失敗。
- 一件削除しても同ページの他記録が残る。
- 再読で新規行が作られ、過去行が変化しない。
- reflectionをHTMLとして解釈しない。

### 完了条件

読書記録を検索、再訪、編集、削除、再読できる。

## 20. 工程10: バックアップとデータ管理

### 主な配置

- `src/infrastructure/backup/`
- `src/features/settings/`

### 設定画面に表示する内容

- 保存対象: URL、タイトル、サイト名、登録日時、状態、振り返り、断念履歴。
- ページ本文は保存しないこと。
- データはブラウザ内に保存し、MVPでは外部送信しないこと。
- 使用権限と目的。
- JSONエクスポート。
- JSONインポート。
- 全データ削除。

### エクスポート

- filenameは`yomiato-backup-YYYY-MM-DD.json`。
- UTF-8、整形済みJSON。
- 秘密情報や診断ログを付加しない。
- 出力前に整合性を検査する。

### インポート

1. `.json`ファイルを選ぶ。
2. ファイルサイズの妥当な上限を設け、巨大ファイルを無制限に読まない。
3. parse、Zod、schemaVersion、参照整合性の順に検証する。
4. 現在件数と復元後件数、全置換であることを表示する。
5. 明示確認後に実行する。
6. 成功後に各画面のlive queryへ反映する。

### 全データ削除

- 「よみあと」と入力した場合だけ最終ボタンを有効にする。
- 実行中は閉じられないようにする。
- 成功後はすべての一覧が空になる。

### 必須テスト

- 正常な往復。
- JSON構文エラー。
- formatName違い。
- 未対応schemaVersion。
- ID、URL、参照の不整合。
- 復元途中失敗時のロールバック。
- 全データ削除の確認条件。
- バックアップに想定外フィールドがあっても安全に扱う方針をZod schemaで固定する。

### 完了条件

ユーザーが自分のデータ内容を理解し、バックアップ、全置換復元、全削除を安全に行える。

## 21. 工程11: Backgroundと統合

### Backgroundの範囲

- Manifest V3 Service Workerとして登録する。
- install/updateイベントで必要な最小処理だけを行う。
- 将来用の状態やDB接続をメモリへ保持しない。
- PopupとDashboardがBackgroundを経由しないとDB操作できない構成にしない。

MVPでイベント処理が不要なら、WXTが正しくService Workerを生成する最小entrypointに留める。バッジ、通知、コンテキストメニューを追加しない。

### 統合確認

- PopupとDashboardが同じIndexedDBを参照する。
- 一方の変更がもう一方の再表示時に反映される。
- Service Worker停止・再起動後も全機能が動く。
- Dashboardを複数タブで開いた同時操作でも一意制約が守られる。

### 完了条件

三つの実行コンテキストが、Service Workerの寿命に依存せず正しく連携する。

## 22. 工程12: E2Eと回帰テスト

### Playwright環境

- 本番に近いビルド済み拡張をテスト対象にする。
- Chromiumのpersistent contextへ拡張を読み込む。
- テストごと、または独立性が必要なsuiteごとに専用profileを使う。
- 拡張IDとService Workerの取得をfixtureへ閉じ込める。
- 実行順に依存するテストを作らない。

### 必須E2Eシナリオ

#### E2E-01 個別登録から読了

1. 一般Webページを開く。
2. PopupでInboxへ追加する。
3. DashboardのInboxに一件表示される。
4. 振り返りを入力して読了する。
5. Inboxから消え、Logに表示される。

#### E2E-02 直接読了

1. Inbox未登録のページを開く。
2. Popupから直接読了へ進む。
3. 振り返りを保存する。
4. Logに一件表示される。

#### E2E-03 重複と再読

1. 同じURLを二度Inboxへ追加し、一件しか作られないことを確認する。
2. 一度読了する。
3. 再読として別の振り返りを記録する。
4. 同じPageに二つのLogが存在する。

#### E2E-04 複数タブ取り込み

1. 対応ページ、重複ページ、対応外ページを用意する。
2. tabs権限を許可する。
3. 複数を選択して取り込む。
4. 結果件数とInboxを確認する。

#### E2E-05 断念と削除

1. 二件をInboxへ入れる。
2. 一件を断念、一件を削除する。
3. Inboxが空になり、内部データでは断念だけ履歴がある。

#### E2E-06 検索・編集・削除

1. 異なるページとreflectionを複数作る。
2. titleとreflectionで検索する。
3. 一件を編集する。
4. 一件を削除する。
5. 再読み込み後も結果が維持される。

#### E2E-07 バックアップ復元

1. 複数種類のデータを作る。
2. JSONを出力する。
3. 全削除する。
4. JSONから復元する。
5. 元の件数と表示内容が戻る。

#### E2E-08 永続性

1. データを作る。
2. browser contextを閉じる。
3. 同じprofileで再起動する。
4. データが残っている。

### 完了条件

単体、Repository、UI、E2Eの全テストが成功し、主要MVPフローに自動回帰テストがある。

## 23. 工程13: 品質・セキュリティ確認

### 自動チェック

順番に実行する。

1. `npm run format:check`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`
6. `npm run test:e2e`
7. `npm run zip`

### 生成物確認

- Manifest V3である。
- permissionsは`activeTab`、optional_permissionsは`tabs`だけである。実装上追加が必要ならADRがある。
- host permissionsがない。
- Content Scriptがない。
- 外部URLからJavaScript、CSS、font、imageを読み込んでいない。
- source map、fixture、テスト、不要なdocsがストアZIPへ入っていない。
- `eval`とインラインscriptがない。
- 実行時ネットワーク通信がない。

### 手動テスト対象

- 通常のニュース記事、ブログ、技術文書、長いURL、日本語タイトル、英語タイトル。
- URLにfragment、tracking parameter、必要なquery parameterがあるページ。
- `chrome://`、Chromeウェブストア、拡張ページ、file URL、PDF。
- titleがないページ、非常に長いtitle、非常に長いreflection。
- tabs権限の許可、拒否、設定画面からの取消。
- ブラウザ再起動、拡張機能の再読み込み、Service Worker停止。
- キーボードのみの操作、200% zoom、ライト／ダーク。
- 空DB、数百件程度のfixture、壊れたバックアップ。

### 完了条件

全自動チェックが成功し、手動確認結果が記録され、重大またはデータ損失につながる既知不具合がない。

## 24. 工程14: CI

### Pull Requestとmain更新時

1. Node.jsを`.nvmrc`と同じメジャーへ設定する。
2. `npm ci`。
3. format check。
4. lint。
5. typecheck。
6. unit、Repository、UI test。
7. production build。
8. E2E。

### CI要件

- lockfileにない依存解決を行わない。
- E2E失敗時に必要最小限のtraceまたはscreenshotをartifactとして残す。
- バックアップ内容やユーザー相当のreflectionをログへ出さない。
- 品質チェックを`continue-on-error`にしない。

### 完了条件

クリーン環境で全品質ゲートを再現できる。

## 25. MVP全体の受け入れ基準

以下をすべて満たした場合だけ、実装完了とする。

### 機能

- 現在ページをInboxへ一回だけ登録できる。
- 複数タブを選んで一括登録できる。
- 現在ページを直接読了として記録できる。
- Inboxから読了、断念、削除できる。
- 読了にはreflectionまたはnoTakeawayが必要である。
- 読書ログを一覧、検索、編集、削除、再読できる。
- 同じURLのInbox重複を防ぎ、同じURLの複数読書記録を許可する。
- JSONバックアップ、全置換復元、全データ削除が動く。

### データ

- ブラウザ再起動後もデータが残る。
- 原子的な操作が途中失敗しても半端な状態を残さない。
- 不正なバックアップで既存データが変化しない。
- DB v1から将来migrationを追加できる構造になっている。

### プライバシー

- アカウント登録がない。
- 外部サーバー通信がない。
- ページ本文を取得・保存しない。
- 保存データと権限の用途を設定画面で確認できる。
- host permissions、Content Script、不要なChrome権限がない。

### 品質

- format、lint、typecheck、test、build、E2E、zipが成功する。
- Chromeへ新規インストールして主要フローを完了できる。
- キーボードで主要フローを完了できる。
- 重大な既知不具合、再現するデータ損失がない。

## 26. 実装中に判断を止める条件

次の場合は、勝手に代替仕様を実装せず質問またはADR更新を行う。

- 必須権限を増やさないとP0が実現できない。
- WXTまたはChromeの現行仕様が技術設計書と明確に異なる。
- DBスキーマv1の変更が既存データを破壊する。
- reflection/noTakeawayの仕様を変える必要がある。
- バックアップschemaVersion 1との互換性を壊す。
- 外部通信、認証、クラウド保存が必要になる。
- 新しい本番依存を追加しないと解決できない。
- 上位文書同士で、ユーザー体験に影響する矛盾がある。

停止時は、次だけを簡潔に提示する。

1. どの工程で止まったか。
2. 確認できた事実。
3. 既存仕様と衝突する点。
4. 選択肢と各影響。
5. 推奨案。

## 27. 実装順チェックリスト

- [ ] 工程0: 作業環境とベースライン
- [ ] 工程1: Domainと共通値
- [ ] 工程2: IndexedDBとRepository
- [ ] 工程3: Applicationユースケース
- [ ] 工程4: Browser Gatewayと権限
- [ ] 工程5: Dashboardの骨格
- [ ] 工程6: Popupと現在ページ登録
- [ ] 工程7: 複数タブ取り込み
- [ ] 工程8: Inbox
- [ ] 工程9: 読書ログ
- [ ] 工程10: バックアップとデータ管理
- [ ] 工程11: Backgroundと統合
- [ ] 工程12: E2Eと回帰テスト
- [ ] 工程13: 品質・セキュリティ確認
- [ ] 工程14: CI
- [ ] MVP全体の受け入れ基準

## 28. 参考資料

実装方法が不明な場合は、ブログ記事や生成例より先に公式資料を確認する。

- [Chrome Extensions: Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Chrome Extensions: activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome Extensions: Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Chrome Extensions: Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [Node.js: Release status](https://nodejs.org/en/about/previous-releases)
- [WXT: Installation](https://wxt.dev/guide/installation.html)
- [WXT: Project Structure](https://wxt.dev/guide/essentials/project-structure.html)
- [WXT: Entrypoints](https://wxt.dev/guide/essentials/entrypoints.html)
- [WXT: Manifest](https://wxt.dev/guide/essentials/config/manifest.html)
- [Dexie: TypeScript](https://dexie.org/docs/Typescript)
- [Dexie: Transactions](https://dexie.org/docs/Dexie/Dexie.transaction())
- [Zod: Basic usage](https://zod.dev/basics)
- [Vitest: Getting Started](https://vitest.dev/guide/)
- [Testing Library: Guiding Principles](https://testing-library.com/docs/guiding-principles/)
- [Playwright: Chrome extensions](https://playwright.dev/docs/chrome-extensions)
