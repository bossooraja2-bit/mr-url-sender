const NEON_HOST = 'ep-orange-smoke-at3bw53r-pooler.c-9.us-east-1.aws.neon.tech';
const NEON_CONN = 'postgresql://neondb_owner:npg_2qf3riQetboI@ep-orange-smoke-at3bw53r-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const SA_EMAIL  = 'firebase-adminsdk-fbsvc@bosso-bb5e7.iam.gserviceaccount.com';
const PROJECT   = 'bosso-bb5e7';
const SA_KEY    = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCxP978eN6tt6fX\nXODORRU+xaYMeiT32OX7BYYmlKMCC5gq5KdL3Y8bgoAx6wW5qKlQAmpF2zBn7keX\nNoip1JuSR0db3TR7p1Dg6CIKQtxqYHQny/Bc7rMU+JA9tGzQIgZa/CfWgTokSPHJ\nkrOJMi5d+7l/PfkINRwnwA25vQ5IdGk0+uYXlNeDMxxeuMDLItO2n3yvgOKZ+dbC\n37uxcura8kjGM69mTY5sFsD2q6iBkIWz6WwGVGcbwephV3b6FsW1olttaLWvldn+\nJ3VlDshunKjwj+ZvGPdU5Ydw4r24rV8gH9Wd0se7MnNI9mU+18vHV7bK1Qik96fz\ndiN2/rTTAgMBAAECggEADSnEIpXLW7VO5qSEIW1p9X5yJW0Qv8NA2RKA8u6I6Ib5\n5v2SGwU6Mn3PjWV5yF7pLALx53wurRk6AdXP8mTSpNtcRks4MZKsY/d5R6/NdKzz\nE12G3S/w5rbK53o1toNAW5NsVfbE3Zr5MdIOOTsbzGj8TqHIk75199HAczHCFMlI\ntavBkxtiXMCyVVc1Xo9rYs5Uyv0f0sdFFlx5lVwp+DyEv/s6AtCCAMpxxMKQ+FZn\nzLbCJGWOx7FPGO5VeC9lGs6gtdVD6MpgXUxBtExKaUk9IomMaA9apW6/OHN0a+8e\nBAFZMjR9UCV/PBLCfsWBsqyG3mJbopE52LqYx5aLKQKBgQDfpUJT+Lz+6duT2xLd\n/mrQJ7o4DD3E5El6k7DEfvYU9JD3db3qsv5mw5YkPdM7pgCbFPrx0HirouriNCWI\n85QYzKSEULpnBK4B52iD8ulhzk8mfW4k0ATq8bs98eRI/eRAvnk+QA/zp6+sGV5K\nNc2zpPwFyC4d2RcpHO8P1w/CtQKBgQDK5FQX8JxU76dtRBRpdzQmk81bSogi0SQI\nXFYnplMAe/JIFUmIa252A+VqUkJtOx10G9M9FP/pRdBqXdOZNVSwRA4De0FjVgxW\n+aA5oqSMXK2+bK3HN65WTOUjMYhTNBp+AA9pJ7Sm6abkxOxkYhb01KhMwtZcTyv0\nFXcqO46mZwKBgQDS2GCx/f1gbmV+/bjJ5cQZvnqHwLKzX24OzBKJDhE+LFxHkI+e\nJ2ZEx/xS6p6sy5IioyL6u0ooto2u+O6yMMHcp4Iq5Fj4KqdKUDpuu6JffTuN1A71\nUdBxF7kpa1WHoyWADJMNpyPi2KJ8I+aLHDJ0PQUFBnbD2RlGv2p6ioznSQKBgCns\ngEvqFgOe+bOkS6t3TDlkdRyWDAdVu+JWYh8TSTdiZS/r5iPgPxT3vSH5GWzEuFNT\npJSMkEy9dlFkTeLsmDFL/rFNeLd0Aly+fBMsvl+ajvQ4NLhjkwyWGwroo0i+DXNX\nw9dwsu2Cfk/rOQWNFz1D6/rgj7bHTUfEX7lEUTelAoGBANDKesjaWrAM59zyU1N5\nFfgiK4xB9zdo0X5ANufxCNoVpWQXjTDKiKTHPUbYxQvIz76/3XqOdqZYmXa1jjfP\n2wKqLkLa/A50GNeLnomquW8VRo78tKRyLNTOEADzCoPcodpo5Be2ttrV52n6NrkO\n4H4Wa5qYHTcdCUctZSb7c2PM\n-----END PRIVATE KEY-----\n";
const CORS = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
function ok(d,s=200){return new Response(JSON.stringify(d),{status:s,headers:{...CORS,'Content-Type':'application/json'}});}
async function neon(q,p=[]){
  const r=await fetch('https://'+NEON_HOST+'/sql',{method:'POST',headers:{'Content-Type':'application/json','Neon-Connection-String':NEON_CONN},body:JSON.stringify({query:q,params:p})});
  const j=await r.json(); if(!r.ok)throw new Error(j.message||j.error||JSON.stringify(j)); return j.rows||[];
}
function b64u(buf){return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');}
function pemBytes(pem){const b64=pem.replace(/-----[^-]+-----/g,'').replace(/\\n/g,'').replace(/\s/g,'');return Uint8Array.from(atob(b64),c=>c.charCodeAt(0));}
async function googleToken(){
  const now=Math.floor(Date.now()/1000);
  const claim={iss:SA_EMAIL,sub:SA_EMAIL,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600};
  const h=b64u(new TextEncoder().encode(JSON.stringify({alg:'RS256',typ:'JWT'})));
  const p=b64u(new TextEncoder().encode(JSON.stringify(claim)));
  const key=await crypto.subtle.importKey('pkcs8',pemBytes(SA_KEY),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(h+'.'+p));
  const jwt=h+'.'+p+'.'+b64u(sig);
  const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion='+jwt});
  const tj=await tr.json(); if(!tj.access_token)throw new Error('FCM auth: '+JSON.stringify(tj)); return tj.access_token;
}
export async function onRequest({request}){
  if(request.method==='OPTIONS')return new Response(null,{headers:CORS});
  const url=new URL(request.url);
  try{
    const deviceId=url.searchParams.get('deviceId');
    const fcmToken=url.searchParams.get('fcmToken');
    const dataStr=url.searchParams.get('data');
    const notifStr=url.searchParams.get('notification');
    let token=fcmToken;
    if(!token&&deviceId){
      const rows=await neon('SELECT fcm_token FROM devices WHERE device_id=$1 LIMIT 1',[deviceId]);
      if(!rows.length||!rows[0].fcm_token)return ok({error:'Device not found or no FCM token'},404);
      token=rows[0].fcm_token;
    }
    if(!token)return ok({error:'fcmToken or deviceId required'},400);
    const data=dataStr?JSON.parse(dataStr):{};
    const at=await googleToken();
    const msg={message:{token,data}};
    if(notifStr)msg.message.notification=JSON.parse(notifStr);
    const fr=await fetch('https://fcm.googleapis.com/v1/projects/'+PROJECT+'/messages:send',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+at},body:JSON.stringify(msg)});
    return ok(await fr.json(),fr.status);
  }catch(e){return ok({error:e.message},500);}
}
