import http from 'node:http';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createControlHub} from './control-hub.mjs';
try{process.loadEnvFile(fileURLToPath(new URL('../.env',import.meta.url)))}catch(error){if(error.code!=='ENOENT')throw error}
const {default:worker}=await import('../worker/index.js');
const env={ELEVENLABS_API_KEY:process.env.ELEVENLABS_API_KEY,ELEVENLABS_VOICE_ID:process.env.ELEVENLABS_VOICE_ID,ELEVENLABS_AGENT_ID:process.env.ELEVENLABS_AGENT_ID};
const port=Number(process.env.PORT||2030);
const interfaces=os.networkInterfaces(),addresses=[...(interfaces.en0||[]),...Object.values(interfaces).flat()].filter(x=>x.family==='IPv4'&&!x.internal&&/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(x.address));
const lanAddress=addresses[0]?.address,baseUrl=`http://${lanAddress||'localhost'}:${port}`,hub=createControlHub({baseUrl,pairingCode:process.env.GOVERNATOR_PAIRING_CODE});
http.createServer(async(req,res)=>{try{
 const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
 const path=new URL(req.url,'http://localhost').pathname;
 if(!local&&path.startsWith('/api/')&&!path.startsWith('/api/control/')){res.writeHead(403);res.end('Use voice services on the laptop.');return}
 const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>3*1024*1024){res.writeHead(413);res.end('Request too large');return}chunks.push(chunk)}
 const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-demo');
 const request=new Request(`http://${req.headers.host||'localhost:'+port}${req.url}`,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
 const response=path.startsWith('/api/control/')?await hub.handle(request,{local,client:req.socket.remoteAddress}):await worker.fetch(request,env,{});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500);res.end('Local preview error')}
}).listen(port,'0.0.0.0',()=>{console.log(`Local: http://localhost:${port}`);console.log(`Phone controls: ${baseUrl}/control`)});
