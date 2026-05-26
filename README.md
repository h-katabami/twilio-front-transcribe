# twilio-front-transcribe2 設計方針

## 1. 目的
このリポジトリは、Twilio書き起こしフロントエンドの次世代実装を、運用しやすい構成で再構築するためのプロジェクトです。

このドキュメントは、実装前の技術選定と運用ルールを確定するための基準書です。

## 2. 確定した前提
- 認証方式は既存継続（Amazon Cognito）。
- API呼び出し時の Authorization は旧実装と同じく IdToken を使用する。
- API呼び出しはプロキシ経由。
- IaCは AWS SAM を採用。
- 配信先は S3 + CloudFront。
- テストコードは作らない（当面）。
- 開発中のデプロイは、ローカル `aws configure` で設定されたアカウントから手動実行する（当面）。

## 3. フロントエンド技術選定
### 3.1 採用
- React
- TypeScript（strict）
- Vite
- React Router
- TanStack Query
- ESLint + Prettier

### 3.3 開発環境バージョン
- Node.js は 20.19.0 以上を使用する。
- ルートに `.nvmrc` / `.node-version` を置き、Node 20 系へ揃える。

### 3.2 非採用（現時点）
- Zod（要望により不採用）
- 自動テスト（要望により不採用）

## 4. アーキテクチャ方針
### 4.1 責務分離
- entities: 業務ドメイン型（共有型）。
- shared/api: HTTP通信クライアント、共通エラーハンドリング。
- features: ユースケース単位の状態組み立て。
- pages/widgets/components: 画面構築と表示。

### 4.2 型の配置ルール
- Domain型: 共有領域（entities もしくは types/domain）。
- Feature ViewModel型: feature配下。
- UI Props型: UIコンポーネント内ローカル定義。

### 4.4 型設計の原則（重要）
- 旧ソースの型定義は持ち越さない。新規実装ではゼロベースで再定義する。
- 型の契約は Step2（TanStack Query 実装）に入る前に固定する。
- 最初に決める型は次の3層。
  - API DTO（受信データ）
  - Domain（業務型）
  - ViewModel（画面型）
- 実装順は「型契約の確定 -> API変換方針の確定 -> Query実装」とする。

### 4.3 データ変換の境界
- APIレスポンス（DTO）をそのままUIに渡さない。
- API層で DTO -> Domain を実施。
- Feature層で Domain -> ViewModel を実施。

## 5. React Router 運用方針
- URLと画面を明確に分離する。
- 未認証アクセスはサインインへリダイレクトする。
- 代表ルート（初期案）:
  - /signin
  - /
  - /transcribe

## 6. TanStack Query 運用方針
### 6.1 Query Key 設計
- companies
- logs + company + startDate + endDate
- logDetail + company + callSid

### 6.2 ルール
- サーバー状態は TanStack Query で管理する。
- useState による重複管理を避ける。
- 初回ローディングと再フェッチ中表示を分ける。
- 検索条件は「編集中（draft）」と「適用済み（applied）」を分離し、`検索` ボタン押下時にのみ applied を更新して再取得する。

## 7. API 方針（プロキシ経由）
- フロント -> プロキシエンドポイント -> バックエンド。
- 認証トークン付与は共通APIクライアントで統一。
- APIエラーは共通変換し、画面には統一形式で渡す。

### 7.1 データ契約（今回の確定）
- companies は既存仕様固定で扱う。
- logs はシンプルな一覧取得とし、レビュー専用フィールドは持たない。
- detail はシンプルな詳細取得とし、レビュー履歴系の追加表示は行わない。
- つまり今回スコープでは、レビュー運用向けの状態管理は行わない。

## 8. IaC 方針（AWS SAM）
### 8.1 管理対象
- Lambda
- API Gateway
- IAM Role/Policy
- 必要な環境変数設定
- （必要に応じて）S3/CloudFront も同一テンプレートで管理

### 8.2 テンプレート運用
- 環境ごとに parameter を切り替える（dev/stg/prod）。
- 変更は pull request ベースで管理する。
- 当面はテンプレートを先行整備し、実デプロイは手動で行う。

### 8.3 当面の運用（手動デプロイ）
- 開発中は、ローカル端末の `aws configure` プロファイルで AWS へアップロードする。
- SAM/CI-CD の設定ファイルは先にリポジトリへ追加し、将来移行時に即有効化できる状態を保つ。
- つまり「運用は手動、構成は自動化前提」で進める。

## 9. CI/CD 方針
### 9.1 CI
- npm ci
- npm run lint
- npm run typecheck
- npm run build

### 9.2 CD（将来有効化する想定）
- sam build
- sam deploy
- フロント成果物を S3 配備
- CloudFront invalidation

### 9.3 現在のCD運用（暫定）
- CI/CD パイプラインからの本番アップロードは行わない。
- 開発中は手動デプロイコマンドを使用する。
- GitHub Actions 側は、まず CI と将来用の CD 雛形のみを管理する。

### 9.4 セキュリティ
- GitHub Actions から AWS へは OIDC AssumeRole を使用する。
- 長期アクセスキーは使わない。
- 手動デプロイ時も、共有キーではなく運用者ごとの認証情報を使用する。

## 10. テストを書かない代わりに何を守るか
このプロジェクトでは自動テストを作らない代わりに、壊れた状態を本番に出さないための最低ルールを固定する。

- typecheck は必ず通す。
- lint は必ず通す。
- build は必ず成功させる。
- デプロイ前後に手動で最低限の画面確認を行う。

わかりやすく言うと、テストの代わりに「型・静的検査・ビルド・手動確認」の4つを毎回必須にする。

## 11. 次に何を実装するか
実装は次の順で進める。先に型契約を固定してから Query 実装に入る。

1. フロント初期雛形（Vite + React + TypeScript + Router + Query）を作成。
2. 新規型契約を定義（旧型は持ち越さない）。
3. API DTO -> Domain -> ViewModel の変換方針を確定。
4. APIクライアント共通層を作成。
5. companies -> logs -> detail の順で Query 化（シンプル取得）。
6. SAMテンプレート作成と環境別パラメータ定義（先に整備、適用は手動）。
7. GitHub Actions の CI と CD 雛形作成（CDは後で有効化）。
8. 移行タイミングで SAM デプロイと CD 自動アップロードを有効化。

## 12. 設計データの置き場所
- 実装に直接使わない設計用データ（認証レスポンス例、APIレスポンス例、メモ）は `docs/samples` に置く。
- ルート直下には実行に必要なファイル（設定、ソース、ビルド設定）のみ置く。
- 配布用の生成物（`*.zip` など）はコミットせず、必要時のみローカルで再生成する。

## 13. 今後課題（UI/UXと画面分割）
- 次フェーズで検討する課題は [docs/future-tasks-ui-ux.md](docs/future-tasks-ui-ux.md) を参照する。

## 14. SAM / CI-CD 導入物
- SAM テンプレート: [template.yaml](template.yaml)
- CI ワークフロー: [.github/workflows/ci.yml](.github/workflows/ci.yml)
- デプロイワークフロー(dev/prod ブランチ連動): [.github/workflows/deploy-dev.yml](.github/workflows/deploy-dev.yml)
- Parameter Store 登録項目(アカウント分離・env なしパス): [docs/parameter-store-dev.md](docs/parameter-store-dev.md)

---

本書は実装開始前の合意文書です。構成を変更する場合は、先にこの文書を更新してから実装に入ります。
