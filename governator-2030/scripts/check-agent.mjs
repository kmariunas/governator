// Live smoke check: one short, billable text conversation using the actual agent and client tools.
import {fileURLToPath} from 'node:url';
import {Conversation} from '@elevenlabs/client';
import {createJourneyController} from '../shared/journey-controller.mjs';
import {createJourneyEngine} from '../shared/journey.mjs';
import {TOOL_NAMES} from '../shared/agent-config.mjs';
try{process.loadEnvFile(fileURLToPath(new URL('../.env',import.meta.url)))}catch(e){if(e.code!=='ENOENT')throw e}
let apiKey=process.env.ELEVENLABS_API_KEY;
if(process.argv.includes('--stdin-key')){console.log('Ready for API key on stdin (input hidden).');if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stdin.resume();apiKey=await new Promise(resolve=>{let input='';const receive=chunk=>{input+=chunk.toString();if(input.includes('\n')){process.stdin.off('data',receive);process.stdin.pause();if(process.stdin.isTTY)process.stdin.setRawMode(false);resolve(input.split('\n')[0].trim())}};process.stdin.on('data',receive)});}
if(!apiKey||!process.env.ELEVENLABS_AGENT_ID){console.error('Configure ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.');process.exit(1)}
if(process.argv.includes('--token-only')){const {default:worker}=await import('../worker/index.js');const res=await worker.fetch(new Request('https://demo.test/api/agent-session',{method:'POST',headers:{'oai-authenticated-user-id':'agent-live-check',origin:'https://demo.test','Content-Type':'application/json'},body:'{}'}),{ELEVENLABS_API_KEY:apiKey,ELEVENLABS_AGENT_ID:process.env.ELEVENLABS_AGENT_ID});const body=await res.json();const passed=res.ok&&typeof body.conversationToken==='string'&&body.conversationToken.length>10;console.log(JSON.stringify({agent_session_api_verified:passed,status:res.status,...(!passed?{error:body.error}:{})}));process.exit(passed?0:1)}
let conversation;const engine=createJourneyEngine();const controller=createJourneyController(engine);const calls=[];let lastActivity=Date.now(),toolErrors=[],agentMessages=[];
function send(message){lastActivity=Date.now();conversation.sendUserMessage(message)}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const timeout=setTimeout(()=>{console.error('Live check timed out.');conversation?.endSession().finally(()=>process.exit(1))},110000);
async function waitFor(predicate,label){const start=Date.now();while(Date.now()-start<25000){if(predicate())return;await pause(100)}throw Error('Timed out waiting for '+label)}
const safe=x=>String(x).replaceAll(apiKey,'[redacted]');
try{
 const res=await fetch('https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id='+encodeURIComponent(process.env.ELEVENLABS_AGENT_ID),{headers:{'xi-api-key':apiKey}});if(!res.ok)throw Error('Signed session failed: '+res.status);const {signed_url:signedUrl}=await res.json();
 const clientTools=Object.fromEntries(TOOL_NAMES.map(name=>[name,async args=>{calls.push(name);const result=await controller.call(name,args);lastActivity=Date.now();console.log('Tool '+name+': '+(result.ok?'ok':result.error));if(!result.ok)toolErrors.push({name,error:result.error});return JSON.stringify(result)}]));
 conversation=await Conversation.startSession({signedUrl,textOnly:true,clientTools,onMessage:({source,message})=>{lastActivity=Date.now();if(source==='ai'){agentMessages.push(message);console.log('Agent: '+safe(message).slice(0,500))}},onError:message=>console.error('Agent connection: '+safe(message))});
 send('I want to get a car driving licence.');
 await waitFor(()=>engine.snapshot().ui?.selection_key==='transmission','transmission cards');
 if(engine.snapshot().ui.options.length!==2)throw Error('Expected manual and automatic cards.');
 await waitFor(()=>Date.now()-lastActivity>1800,'agent finish');
 if(agentMessages.some(message=>/Vienna/i.test(message)))throw Error('Agent mentioned location before it became relevant.');
 if(!agentMessages.some(message=>/motorcycle|class A/i.test(message)))throw Error('Agent did not acknowledge the existing motorcycle licence.');
 let ui=engine.snapshot().ui;
 const transmission=await controller.call('record_selection',{selection_key:'transmission',option_id:ui.options.find(o=>o.value==='automatic').id,presentation_id:ui.id});
 send('I clicked Automatic. This choice is already saved: '+JSON.stringify(transmission)+'. Explain the visible schools.');
 await waitFor(()=>engine.snapshot().ui?.selection_key==='school_id','school map');
 await waitFor(()=>Date.now()-lastActivity>1800,'agent finish');ui=engine.snapshot().ui;
 if(ui.type!=='map'||!ui.options.every(p=>p.location==='Vienna'))throw Error('Expected schools in Vienna.');
 const school=await controller.call('record_selection',{selection_key:'school_id',option_id:ui.options[1].id,presentation_id:ui.id});
 if(!school.ok||engine.snapshot().ui.selection_key!=='medical_slot_id')throw Error('School click did not open appointment times.');
 send('I clicked the second school. The app already saved this and advanced the screen: '+JSON.stringify(school)+'. Explain the current visible appointment times.');
 await waitFor(()=>Date.now()-lastActivity>1800,'appointment explanation');
 ui=engine.snapshot().ui;
 if(ui.type!=='calendar'||ui.selection_key!=='medical_slot_id')throw Error('Expected time calendar without doctor cards.');
 const r=await controller.call('record_selection',{selection_key:'medical_slot_id',option_id:ui.options[0].id,presentation_id:ui.id});
 if(!r.ok||!r.booking)throw Error('Time choice failed to book immediately.');
 send('I selected a time on screen. The app already booked it: '+JSON.stringify(r)+'.');
 await waitFor(()=>Date.now()-lastActivity>1800,'booking confirmation');
 if(!agentMessages.some(message=>/Vienna/i.test(message)))throw Error('Agent did not use Vienna when presenting local schools.');
 if(!engine.snapshot().actions.book_medical||engine.snapshot().ui?.selection_key==='booking_approval'||engine.snapshot().ui?.selection_key==='doctor_id')throw Error('Unexpected extra booking step.');
 if(engine.snapshot().preferences.transmission!=='automatic')throw Error('Spoken preference was not saved.');
 console.log(JSON.stringify({passed:true,clicked_school_advances:true,transmission_cards:true,city:"Vienna",actual_tools:[...new Set(calls)],map:true,calendar:true,time_selection_books:true,no_doctor_choice:true,saved_transmission:engine.snapshot().preferences.transmission,recoverable_tool_errors:toolErrors}));
}catch(error){console.error(safe(error.message));process.exitCode=1}finally{clearTimeout(timeout);await conversation?.endSession()}
