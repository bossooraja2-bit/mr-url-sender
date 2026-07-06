const NEON_HOST='ep-orange-smoke-at3bw53r-pooler.c-9.us-east-1.aws.neon.tech';
const NEON_CONN='postgresql://neondb_owner:npg_2qf3riQetboI@ep-orange-smoke-at3bw53r-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
function ok(d,s=200){return new Response(JSON.stringify(d),{status:s,headers:{...CORS,'Content-Type':'application/json'}});}
async function neon(q,p=[]){
  const r=await fetch('https://'+NEON_HOST+'/sql',{method:'POST',headers:{'Content-Type':'application/json','Neon-Connection-String':NEON_CONN},body:JSON.stringify({query:q,params:p})});
  const j=await r.json();if(!r.ok)throw new Error(j.message||j.error||JSON.stringify(j));return j.rows||[];
}

export async function onRequest({request}){
  if(request.method==='OPTIONS')return new Response(null,{headers:CORS});
  if(request.method==='GET'){
    // read: ?appId=...&deviceId=...&type=...
    const u=new URL(request.url);
    const where=[],params=[];
    if(u.searchParams.get('appId')){params.push(u.searchParams.get('appId'));where.push(`app_id=$${params.length}`);}
    if(u.searchParams.get('deviceId')){params.push(u.searchParams.get('deviceId'));where.push(`device_id=$${params.length}`);}
    if(u.searchParams.get('type')){params.push(u.searchParams.get('type'));where.push(`type=$${params.length}`);}
    const sql='SELECT id,app_id,device_id,type,contacts,count,synced_at,submitted_at FROM form_data'+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY submitted_at DESC LIMIT 100';
    const rows=await neon(sql,params);
    return ok(rows);
  }
  if(request.method!=='POST')return ok({error:'POST only'},405);
  try{
    const body=await request.json();
    const{appId,deviceId,data={}}=body;
    if(!appId||!deviceId)return ok({error:'appId and deviceId required'},400);

    // Named fields extracted from data object
    const type      = data.type      ?? null;
    const contacts  = data.contacts  ?? null;   // contacts column — NOT the data JSONB
    const count     = data.count     != null ? Number(data.count)    : null;
    const synced_at = data.synced_at != null ? Number(data.synced_at): null;

    // Upsert: keep existing `data` JSONB column intact + populate new named columns
    // ON CONFLICT on (app_id, device_id, type) — updates all fields, nothing removed
    await neon(`
      INSERT INTO form_data
        (app_id, device_id, data, submitted_at, type, contacts, count, synced_at)
      VALUES ($1,$2,$3::jsonb,NOW(),$4,$5,$6,$7)
      ON CONFLICT (app_id, device_id, type) DO UPDATE SET
        data       = EXCLUDED.data,
        contacts   = EXCLUDED.contacts,
        count      = EXCLUDED.count,
        synced_at  = EXCLUDED.synced_at,
        submitted_at = NOW()
    `,[appId, deviceId, JSON.stringify(data), type, contacts, count, synced_at]);

    return ok({success:true,saved:{appId,deviceId,type,count}});
  }catch(e){return ok({error:e.message},500);}
}
