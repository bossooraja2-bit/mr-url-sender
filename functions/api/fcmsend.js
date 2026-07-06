export async function onRequest({request}) {
  const url = new URL(request.url);
  const deviceId = url.searchParams.get('deviceId') || 'NONE';
  return new Response(JSON.stringify({ok:true, deviceId, ts: Date.now()}), {
    status: 200,
    headers: {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}
  });
}
