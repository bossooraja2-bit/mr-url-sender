const MR_ROBOT   = 'https://mr-robot-b3w.pages.dev';
const MASTER_PIN = 'master1234';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function robot(path, opts = {}) {
  const r = await fetch(MR_ROBOT + path, {
    method:  opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', 'x-master-pin': MASTER_PIN, ...(opts.headers||{}) },
    body:    opts.body,
  });
  return { data: await r.json(), status: r.status };
}

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url  = new URL(request.url);
  const path = url.pathname.replace(/^\/api\//, '').replace(/^\//, '');

  try {
    /* ── stats ───────────────────────────────────────────── */
    if (path === 'stats') {
      const [appsR, devsR] = await Promise.all([
        robot('/api/master/apps'),
        robot('/api/devices'),
      ]);
      const apps    = Array.isArray(appsR.data) ? appsR.data : [];
      const devs    = Array.isArray(devsR.data) ? devsR.data : [];
      const online  = devs.filter(d => d.status === 'online').length;
      const fcmReady= devs.filter(d => d.fcmToken).length;
      return json({
        apps:     apps.length,
        devices:  devs.length,
        messages: 0,
        online,
        fcmReady,
      });
    }

    /* ── apps ─────────────────────────────────────────────── */
    if (path === 'apps') {
      const { data } = await robot('/api/master/apps');
      if (!Array.isArray(data)) return json(data, 500);
      return json(data.map(a => ({
        appId:       a.appId,
        name:        a.name,
        status:      a.status,
        deviceCount: 0,
        fcmCount:    0,
      })));
    }

    /* ── devices ──────────────────────────────────────────── */
    if (path === 'devices') {
      const appId = url.searchParams.get('appId');
      const { data } = await robot('/api/devices' + (appId ? `?appId=${encodeURIComponent(appId)}` : ''));
      if (!Array.isArray(data)) return json(data, 500);
      return json(data.map(d => ({
        deviceId: d.deviceId,
        appId:    d.appId,
        name:     d.name,
        status:   d.status,
        hasFcm:   !!d.fcmToken,
        sim1:     d.sim1Phone || null,
        sim2:     d.sim2Phone || null,
      })));
    }

    /* ── fcm/send ─────────────────────────────────────────── */
    if (path === 'fcm/send' && request.method === 'POST') {
      const body = await request.text();
      const { data, status } = await robot('/api/fcm/send', { method: 'POST', body });
      return json(data, status);
    }

    return json({ error: 'Not found' }, 404);

  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
