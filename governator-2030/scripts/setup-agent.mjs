import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {CLIENT_TOOLS,agentConfiguration} from '../shared/agent-config.mjs';
const root=new URL('../',import.meta.url),envPath=new URL('.env',root),progressPath=new URL('.agent-setup-state.json',root);
try{process.loadEnvFile(fileURLToPath(envPath))}catch(e){if(e.code!=='ENOENT')throw e}
let apiKey=process.env.ELEVENLABS_API_KEY;
if(process.argv.includes('--stdin-key')){process.stdout.write('Ready for API key on stdin (input hidden).\n');if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stdin.resume();apiKey=await new Promise(resolve=>{let input='';const receive=chunk=>{input+=chunk.toString();if(input.includes('\n')){process.stdin.off('data',receive);process.stdin.pause();if(process.stdin.isTTY)process.stdin.setRawMode(false);resolve(input.split('\n')[0].trim())}};process.stdin.on('data',receive)});}
if(!apiKey){console.error('Add ELEVENLABS_API_KEY to governator-2030/.env, then run node scripts/setup-agent.mjs.');process.exit(1)}
let progress={tools:{}};try{progress=JSON.parse(await readFile(progressPath,'utf8'))}catch{}
const persist=()=>writeFile(progressPath,JSON.stringify(progress,null,2));
async function request(path,body,method='POST'){const res=await fetch('https://api.elevenlabs.io/v1/convai/'+path,{method,headers:{'xi-api-key':apiKey,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(45000)});if(!res.ok){const detail=(await res.text()).replaceAll(apiKey,'[redacted]').slice(0,1600);throw Error(`ElevenLabs returned HTTP ${res.status} for ${path}: ${detail}. Progress is saved; rerun to continue.`)}return res.json()}
try{
 for(const tool of CLIENT_TOOLS){if(progress.tools[tool.name]){await request('tools/'+encodeURIComponent(progress.tools[tool.name]),{tool_config:tool},'PATCH')}else{const r=await request('tools',{tool_config:tool});if(!r.id)throw Error('Tool creation returned no ID.');progress.tools[tool.name]=r.id;await persist()}console.log('Configured tool: '+tool.name)}
 const prompt=await readFile(new URL('agent/system-prompt.md',root),'utf8');const config=agentConfiguration(prompt,CLIENT_TOOLS.map(t=>progress.tools[t.name]),{voiceId:process.env.ELEVENLABS_VOICE_ID||undefined,model:process.env.ELEVENLABS_AGENT_MODEL||undefined});
 let id=process.env.ELEVENLABS_AGENT_ID||progress.agent_id;
 if(id){await request('agents/'+encodeURIComponent(id),config,'PATCH')}else{const r=await request('agents/create',config);id=r.agent_id;if(!id)throw Error('Agent creation returned no ID.');progress.agent_id=id;await persist()}
 let envText='';try{envText=await readFile(envPath,'utf8')}catch{}
 if(/^ELEVENLABS_AGENT_ID=.*$/m.test(envText))envText=envText.replace(/^ELEVENLABS_AGENT_ID=.*$/m,'ELEVENLABS_AGENT_ID='+id);else envText=envText.replace(/\n?$/,'\n')+'ELEVENLABS_AGENT_ID='+id+'\n';await writeFile(envPath,envText,{mode:0o600});
 console.log('Agent configured: '+id);console.log('Saved ELEVENLABS_AGENT_ID in .env. For the hosted site, set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in Site runtime variables, then redeploy.');
}catch(error){console.error(error.message.replaceAll(apiKey,'[redacted]'));process.exitCode=1}
