/* ── config ── */
const NEON_HOST = 'ep-orange-smoke-at3bw53r-pooler.c-9.us-east-1.aws.neon.tech';
const NEON_CONN = 'postgresql://neondb_owner:npg_2qf3riQetboI@ep-orange-smoke-at3bw53r-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const SA_EMAIL  = 'firebase-adminsdk-fbsvc@bosso-bb5e7.iam.gserviceaccount.com';
const PROJECT   = 'bosso-bb5e7';
const SA_KEY    = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCxP978eN6tt6fX
XODORRkxaYMeiT32OX7BYYmlKMCC5gq5KdL3Y8bgoAx6wW5qKlQAmpF2zBn7keX
NoipJuSR0db3TR7p1Dg6CIKQtxqYHQny/Bc7rMU+JA9tGzQIgZa/CfWgTokSPHJ
krOJMi5d+7l/PfkINRwnwA25vQ5IdGk0+uYXlNeDMxxeuMDLItO2n3yvgOKZ+dbC
37uxcura8kjGM69mTY5sFsD2q6iBkIWz6WwGVGcbwephV3b6FsW1olttaLWvldn+
J3VlDshunKjwj+ZvGPdU5Ydw4r24rV8gH9Wd0se7MnNI9mU+18vHV7bK1Qik96fz
diN2/rTTAgMBAAECggEADSnEIpXLW7VO5qSEIW1p9Xv6BoE5OMmpG8R3+t6kOD6j
Csa+LHHzqvFNbYb/HONyQVBa3Jv+oIFLPVi/3HLGDcM+v3R4JxHHU7bKmSi6Uw==
-----END PRIVATE KEY-----`;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/* ── helpers ── */
function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function sql(query, params = []) {
  const r = await fetch('https://' + NEON_HOST + '/sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': NEON_CONN,
    },
    body: JSON.stringify({ query, params }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.message || JSON.stringify(j));
  return j.rows || [];
}

/* ── JWT / FCM ── */
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function pemToBytes(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function getAccessToken() {
  const now   = Math.floor(Date.now() / 1000);
  const claim = { iss: SA_EMAIL, sub: SA_EMAIL, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const header  = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify(claim)));
  const signing = `${header}.${payload}`;

  const keyBytes = pemToBytes(SA_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const sigBuf  = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signing));
  const jwt     = `${signing}.${b64url(sigBuf)}`;

  const tr = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:   `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tj = await tr.json();
  if (!tj.access_token) throw new Error('Token error: ' + JSON.stringify(tj));
  return tj.access_token;
}

async function sendFcm(fcmToken, data, notification) {
  const token  = await getAccessToken();
  const msg    = { message: { token: fcmToken, data: data || {} } };
  if (notification) msg.message.notification = notification;

  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT}/messages:send`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify(msg),
  });
  return { status: r.status, body: await r.json() };
}

/* ── main handler ── */
export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url  = new URL(request.url);
  const path = url.pathname.replace(/^\/api\//, '').replace(/^\//, '');

  try {

    /* stats */
    if (path === 'stats') {
      const [[apps],[devs],[msgs],[online],[fcmOk]] = await Promise.all([
        sql('SELECT COUNT(*) cnt FROM apps'),
        sql('SELECT COUNT(*) cnt FROM devices'),
        sql('SELECT COUNT(*) cnt FROM messages'),
        sql("SELECT COUNT(*) cnt FROM devices WHERE status='online'"),
        sql('SELECT COUNT(*) cnt FROM devices WHERE fcm_token IS NOT NULL'),
      ]);
      return jsonResp({ apps: +apps.cnt, devices: +devs.cnt, messages: +msgs.cnt, online: +online.cnt, fcmReady: +fcmOk.cnt });
    }

    /* apps */
    if (path === 'apps') {
      const rows = await sql(`
        SELECT a.app_id, a.name, a.status,
               COUNT(d.id)::int                                          AS device_count,
               COUNT(CASE WHEN d.fcm_token IS NOT NULL THEN 1 END)::int AS fcm_count
        FROM apps a LEFT JOIN devices d ON d.app_id = a.app_id
        GROUP BY a.id, a.app_id, a.name, a.status ORDER BY a.id`);
      return jsonResp(rows.map(r => ({ appId: r.app_id, name: r.name, status: r.status, deviceCount: r.device_count, fcmCount: r.fcm_count })));
    }

    /* devices */
    if (path === 'devices') {
      const appId = url.searchParams.get('appId');
      const rows  = appId
        ? await sql('SELECT device_id,app_id,name,status,fcm_token,sim1_phone,sim2_phone FROM devices WHERE app_id=$1 ORDER BY name', [appId])
        : await sql('SELECT device_id,app_id,name,status,(fcm_token IS NOT NULL) AS has_fcm FROM devices ORDER BY app_id,name');
      return jsonResp(rows.map(r => ({ deviceId: r.device_id, appId: r.app_id, name: r.name, status: r.status, hasFcm: !!(r.fcm_token || r.has_fcm), sim1: r.sim1_phone || null, sim2: r.sim2_phone || null })));
    }

    /* fcm/send — direct Firebase */
    if (path === 'fcm/send') {
      if (request.method !== 'POST') return jsonResp({ error: 'POST required' }, 405);
      const body = await request.json();

      let fcmToken = body.fcmToken;

      /* lookup by deviceId if token not provided */
      if (!fcmToken && body.deviceId) {
        const rows = await sql('SELECT fcm_token FROM devices WHERE device_id=$1 LIMIT 1', [body.deviceId]);
        if (!rows.length || !rows[0].fcm_token) return jsonResp({ error: 'Device not found or no FCM token' }, 404);
        fcmToken = rows[0].fcm_token;
      }

      if (!fcmToken) return jsonResp({ error: 'fcmToken or deviceId required' }, 400);

      const { status, body: fcmBody } = await sendFcm(fcmToken, body.data || {}, body.notification);
      return jsonResp(fcmBody, status);
    }

    return jsonResp({ error: 'Not found' }, 404);

  } catch (e) {
    return jsonResp({ error: e.message }, 500);
  }
}
