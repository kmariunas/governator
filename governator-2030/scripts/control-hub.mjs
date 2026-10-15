import {randomBytes,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
export const PROVIDER_EVENTS=['medical','first_aid','lesson_approval','training','theory','practical'];
export function createControlHub({baseUrl,pairingCode}){
 const serverId=randomUUID();
 const token=randomBytes(24).toString('hex'),code=/^[0-9]{6}$/.test(String(pairingCode||''))?String(pairingCode):String(randomInt(100000,1000000)),sessions=new Map(),attempts=new Map();
 const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 const equals=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
 function session(id){if(!/^[a-zA-Z0-9_-]{8,80}$/.test(id||''))throw Error('Invalid session');if(!sessions.has(id)){if(sessions.size>=20)throw Error('Too many active sessions');sessions.set(id,{id,state:null,updatedAt:0,events:[],sequence:0})}return sessions.get(id)}
 return {async handle(request,{local=false,client='local'}={}){
  const url=new URL(request.url),route=url.pathname;
  if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'Origin not allowed'},403);
  if(route==='/api/control/info')return local?json({token,pairingCode:code,baseUrl,serverId}):json({error:'Open pairing settings on the laptop.'},403);
  let body={};if(request.method==='POST'){const raw=await request.text();if(raw.length>32000)return json({error:'Request too large'},413);try{body=JSON.parse(raw)}catch{return json({error:'Invalid request'},400)}}
  if(route==='/api/control/pair'&&request.method==='POST'){
   const now=Date.now(),record=attempts.get(client);if(!record||now-record.at>60000)attempts.set(client,{at:now,count:1});else if(++record.count>8)return json({error:'Wait a minute before trying again.'},429);
   return equals(String(body.code||''),code)?json({token}):json({error:'Incorrect pairing code.'},401);
  }
  if(!equals(request.headers.get('x-control-token'),token))return json({error:'Pair this device first.'},401);
  try{
   if(route==='/api/control/state'&&request.method==='POST'){
    const s=session(body.sessionId);if(!body.state||!Array.isArray(body.state.steps))return json({error:'Invalid journey state'},400);s.state=body.state;s.updatedAt=Date.now();return json({ok:true});
   }
   if(route==='/api/control/state'&&request.method==='GET')return json({sessions:[...sessions.values()].map(({id,state,updatedAt,events})=>({id,state,updatedAt,events:events.slice(-8)}))});
   if(route==='/api/control/events'&&request.method==='GET'){const s=session(url.searchParams.get('sessionId'));return json({events:s.events.filter(event=>event.sequence>Number(url.searchParams.get('after')||0))})}
   if(route==='/api/control/event'&&request.method==='POST'){
    const s=session(body.sessionId);if(!s.state||Date.now()-s.updatedAt>20000)return json({error:'The laptop is offline. Keep the assistant page open.'},409);
    if(!PROVIDER_EVENTS.includes(body.kind))return json({error:'Unknown provider update'},400);
    if(s.events.some(event=>event.kind===body.kind&&event.status==='pending'))return json({ok:true,queued:true});
    const event={id:randomUUID(),sequence:++s.sequence,kind:body.kind,status:'pending'};s.events.push(event);return json({ok:true,event});
   }
   if(route==='/api/control/ack'&&request.method==='POST'){const s=session(body.sessionId),event=s.events.find(e=>e.id===body.id);if(!event)return json({error:'Unknown update'},404);event.status=body.ok?'applied':'failed';event.error=body.error?String(body.error).slice(0,200):undefined;return json({ok:true})}
  }catch(error){return json({error:error.message},400)}
  return json({error:'Not found'},404);
 }};
}
