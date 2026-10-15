export function createRemoteControl({snapshot,onEvent}){
 const sessionId=sessionStorage.getItem('governator-control-session')||crypto.randomUUID();sessionStorage.setItem('governator-control-session',sessionId);
 let info=null,publishTimer,polling=false,lastPublish=0;
 let cursor=Number(sessionStorage.getItem('governator-control-cursor')||0);
 async function connect(){const response=await fetch('/api/control/info');if(!response.ok)throw Error('Phone controls are available on the local server.');info=await response.json();if(sessionStorage.getItem('governator-control-server')!==info.serverId){cursor=0;sessionStorage.setItem('governator-control-cursor','0');sessionStorage.setItem('governator-control-server',info.serverId)}return info}
 async function request(path,body){if(!info)await connect();const response=await fetch('/api/control/'+path,{method:body?'POST':'GET',headers:{'x-control-token':info.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(response.status===401){info=null;throw Error('Reconnecting phone controls.')}const data=await response.json();if(!response.ok)throw Error(data.error||'Controls unavailable.');return data}
 async function publishNow(){await request('state',{sessionId,state:snapshot()});lastPublish=Date.now()}
 function publish(){clearTimeout(publishTimer);publishTimer=setTimeout(()=>publishNow().catch(()=>{}),100)}
 async function poll(){if(polling)return;polling=true;try{if(Date.now()-lastPublish>5000)await publishNow();const data=await request('events?'+new URLSearchParams({sessionId,after:String(cursor)}));for(const event of data.events){let ok=true,error;try{await onEvent(event.kind)}catch(e){ok=false;error=e.message}cursor=event.sequence;sessionStorage.setItem('governator-control-cursor',String(cursor));await request('ack',{sessionId,id:event.id,ok,error});await publishNow()}}catch{}finally{polling=false}}
 const interval=setInterval(poll,800);publish();
 return {publish,async pairing(){if(!info)await connect();await publishNow();return {url:info.baseUrl+'/control',code:info.pairingCode}},close(){clearInterval(interval);clearTimeout(publishTimer)}};
}
