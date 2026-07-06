export async function onRequest({request}) {
  const url = new URL(request.url);
  return new Response(JSON.stringify({ok:true, path:url.pathname, ts:Date.now()}), {
    status: 200,
    headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}
  });
}
