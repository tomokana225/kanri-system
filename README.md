# 授業予約システム - Firebase & React

このプロジェクトは、生徒、先生、管理者のための包括的な授業予約システムです。Firebaseをバックエンドとして使用し、リアルタイムのデータ同期と安全な認証を実現しています。

## 主な機能

- **ロールベースのアクセス制御**: 生徒、先生、管理者の3つの異なる役割。
- **Firebase認証**: メールとパスワードによる安全なログイン。
- **Firestoreデータベース**: 予約、スケジュール、メッセージなどのデータをリアルタイムで管理。
- **リアルタイム更新**: 予約やメッセージが追加されると、関係者の画面が自動的に更新されます。
- **管理者ダッシュボード**: ユーザー管理、全予約の閲覧、スケジュール作成機能。

---

## 🛠️ セットアップ手順

このアプリケーションをあなたの環境で動作させるには、いくつかの設定が必要です。

### ステップ1: Firebaseプロジェクトの作成

1.  [Firebaseコンソール](https://console.firebase.google.com/)にアクセスし、新しいプロジェクトを作成します。
2.  プロジェクト設定画面で、「ウェブアプリ」を追加し、表示される`firebaseConfig`の値をメモしておきます。これらは後でCloudflareで設定します。

### ステップ2: Firebaseのサービスを有効にする

1.  **Authentication**:
    - Firebaseコンソールの「Authentication」セクションに移動します。
    - 「Sign-in method」タブで、「メール/パスワード」を有効にします。

2.  **Firestore Database**:
    - 「Firestore Database」セクションに移動します。
    - **「データベースの作成」** をクリックします。
    - **本番環境モード**で開始し、ロケーションを選択します（例: `asia-northeast1`）。
    - **【重要】このステップを忘れると、アプリは `400 Bad Request` エラーで動作しません。**

### ステップ3: デフォルト管理者アカウントの作成

1.  **Authentication**:
    - Firebaseコンソールの「Authentication」セクションに戻ります。
    - 「ユーザーを追加」ボタンをクリックし、以下の情報で管理者ユーザーを作成します。
      - **メールアドレス**: `admin@admin.com`
      - **パスワード**: `admin123`

2.  **Firestore**:
    - Firestoreのデータ画面に移動します。
    - `users`という名前で新しいコレクションを開始します。
    - ドキュメントIDとして、先ほど作成した管理者ユーザーの**UID**（Authentication画面で確認できます）を貼り付けます。
    - 以下のフィールドを追加します:
      - `name` (string): `管理者`
      - `email` (string): `admin@admin.com`
      - `role` (string): `管理者`

### ステップ4: Cloudflare Pagesへのデプロイ

1.  このリポジトリをあなたのGitHubアカウントにフォークします。
2.  Cloudflare Pagesで新しいプロジェクトを作成し、フォークしたリポジトリを選択します。
3.  **ビルド設定**:
    - **フレームワークプリセット**: `Vite`
    - **ビルドコマンド**: `npm run build`
    - **ビルド出力ディレクトリ**: `dist`
4.  **環境変数の設定**:
    - `設定` > `環境変数` に移動します。
    - **🚨【最重要】🚨 `(auth/invalid-api-key)` エラーを防ぐため、必ず暗号化されていない「環境変数」として設定してください。「シークレット」として設定すると、ビルド時にキーが読み込めずエラーになります。**
    - 以下のキーと値を **「環境変数を追加」** から設定します。
      - `FIREBASE_API_KEY`
      - `FIREBASE_AUTH_DOMAIN`
      - `FIREBASE_PROJECT_ID`
      - `FIREBASE_STORAGE_BUCKET`
      - `FIREBASE_MESSAGING_SENDER_ID`
      - `FIREBASE_APP_ID`
      - `FIREBASE_MEASUREMENT_ID`
5.  「保存してデプロイする」をクリックします。

---

## 🔥 【最重要】エラー解決: セキュリティルールとインデックスのデプロイ

**`Missing or insufficient permissions` (権限がありません) というエラーや、メッセージ機能のエラーが発生した場合、以下の手順が必須です。**

ローカルPCに[Firebase CLI](https://firebase.google.com/docs/cli)がインストールされている必要があります。

```bash
# 1. Firebaseにログイン (まだの場合)
firebase login

# 2. あなたのFirebaseプロジェクトを選択
# YOUR_FIREBASE_PROJECT_ID は実際のプロジェクトIDに置き換えてください
firebase use YOUR_FIREBASE_PROJECT_ID

# 3. セキュリティルールをデプロイ (権限エラーを解決します)
firebase deploy --only firestore:rules

# 4. データベースのインデックスをデプロイ (メッセージ機能のエラーを解決します)
firebase deploy --only firestore:indexes
```

これらのコマンドは、プロジェクト内にある`firestore.rules`と`firestore.indexes.json`ファイルをあなたのFirebaseプロジェクトに適用し、アプリケーションが正しくデータを読み書きできるようにします。