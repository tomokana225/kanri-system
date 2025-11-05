# 授業予約システム (Firebase + Cloudflare版)

このアプリケーションは、生徒、先生、管理者のための授業予約システムです。バックエンドにはFirebaseを使用し、リアルタイムでのデータ更新と安全な認証を実現しています。

## セットアップ手順

このアプリケーションをデプロイして使用するには、以下の手順に従ってください。

### 1. Firebase プロジェクトの作成

1.  [Firebase コンソール](https://console.firebase.google.com/)にアクセスし、新しいプロジェクトを作成します。
2.  プロジェクト設定画面から、**ウェブアプリ**（</>）を追加します。
3.  表示される`firebaseConfig`オブジェクトの値をコピーしておきます。これがCloudflareのシークレットになります。

### 2. Firebase Authentication の有効化

1.  Firebaseコンソールの「Authentication」セクションに移動します。
2.  「Sign-in method」タブで、「メール/パスワード」プロバイダを有効にします。
3.  「Users」タブで、テスト用のユーザー（生徒、先生、管理者）をいくつか追加します。ここで登録したメールアドレスとパスワードでログインします。

### 3. Firestore Database の設定

1.  Firebaseコンソールの「Firestore Database」セクションに移動します。
2.  「データベースの作成」をクリックし、**テストモード**で開始します。（本番環境では、後述のセキュリティルールを適用してください）
3.  以下のコレクションを手動で作成し、各ユーザーのデータを追加します。
    *   **`users`** コレクション:
        *   ドキュメントIDは、Authenticationで作成したユーザーの**UID**と**同じ**にしてください。
        *   各ドキュメントには、`name`, `email`, `role` (`生徒`, `先生`, `管理者`) のフィールドを追加します。

### 4. Firestore セキュリティルールの適用

1.  Firestoreの「ルール」タブに移動します。
2.  提供されている`firestore.rules`ファイルの内容を貼り付けて、ルールを公開します。これにより、アプリケーションのデータが保護されます。

### 5. Gemini APIキーの準備 (任意)

メッセージの下書き生成機能を使用する場合、[Google AI Studio](https://aistudio.google.com/app/apikey)でAPIキーを取得してください。

### 6. Cloudflare Pages へのデプロイ

1.  このプロジェクトをあなた自身のGitHubリポジトリにフォークまたはプッシュします。
2.  [Cloudflare ダッシュボード](https://dash.cloudflare.com/)にログインし、「Workers & Pages」に移動します。
3.  「アプリケーションを作成」 > 「Pages」 > 「Gitに接続」を選択し、あなたのリポジトリを選択します。
4.  ビルド設定は、フレームワークプリセットで「Vite」を選択すれば自動的に設定されます。
5.  **環境変数（シークレット）**を設定します。
    *   `設定` > `環境変数` > `本番環境` に移動します。
    *   **手順1**で取得したFirebaseのConfig情報と、**手順5**で取得したGeminiキーを、以下の名前で追加します。**必ず「暗号化」の鍵アイコンをクリックしてシークレットとして保存してください。**
        *   `FIREBASE_API_KEY`
        *   `FIREBASE_AUTH_DOMAIN`
        *   `FIREBASE_PROJECT_ID`
        *   `FIREBASE_STORAGE_BUCKET`
        *   `FIREBASE_MESSAGING_SENDER_ID`
        *   `FIREBASE_APP_ID`
        *   `FIREBASE_MEASUREMENT_ID`
        *   `GEMINI_API_KEY` (任意)
6.  「保存してデプロイする」をクリックします。デプロイが完了すると、アプリケーションがインターネット上で利用可能になります。
