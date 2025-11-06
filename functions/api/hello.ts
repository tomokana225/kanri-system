// functions/api/hello.ts

// Fix: Add a type definition for PagesFunction to resolve the 'Cannot find name' TypeScript error.
// Removed unused 'context' parameter and 'Env' type to fix build errors.
type PagesFunction = () => Response | Promise<Response>;

/**
 * PagesFunctionはCloudflare Pages Functionsのメインハンドラです。
 * @param context - リクエストに関する情報を含むコンテキストオブジェクト
 */
export const onRequest: PagesFunction = async () => {
  // contextオブジェクトにはリクエストに関する情報が含まれます。
  // context.request: 受信したリクエストオブジェクト
  // context.env: ダッシュボードで設定されたBindings
  // context.params: 動的ルーティングのパラメータ
  // context.waitUntil: レスポンス送信後もタスクを実行させるための関数
  // context.next: ミドルウェアをチェインするための関数
  // context.data: ミドルウェア間でデータを渡すためのオブジェクト

  const data = {
    message: 'こんにちは、Cloudflare Functionsから！',
  };

  // JSONレスポンスを返します。
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}
