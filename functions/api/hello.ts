// functions/api/hello.ts

/**
 * onRequestはCloudflare Pages Functionsのメインハンドラです。
 * @param context - リクエストに関する情報を含むコンテキストオブジェクト (この関数では未使用)
 */
// Fix: Inlined the function type to resolve the 'Cannot find name PagesFunction' error.
export const onRequest: () => Promise<Response> = async () => {
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
