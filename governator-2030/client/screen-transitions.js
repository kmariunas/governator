// Coalesce tool bursts and show only the latest requested screen after a transition.
export function createScreenTransitions({key,commit,target,reducedMotion=()=>false}){
 let timer=null,running=false,queued=false,lastKey,holdUntil=0,forceTransition=false;
 async function flush(){
  timer=null;if(running){queued=true;return}running=true;
  const nextKey=key(),changed=lastKey!==undefined&&(nextKey!==lastKey||forceTransition);forceTransition=false;
  const outgoing=target();let incoming;
  const move=()=>{const previousKey=lastKey;commit();lastKey=key();incoming=target();if(previousKey!==undefined&&previousKey!==lastKey)window.scrollTo({top:0,behavior:'instant'})};
  const activeFocus=document.activeElement;
  const restoreFocus=!!outgoing?.contains(activeFocus);
  try{
   if(!changed||reducedMotion()){move();return}
   if(outgoing)outgoing.inert=true;
   if(document.startViewTransition){
    const transition=document.startViewTransition(move);
    await transition.updateCallbackDone;
    if(incoming)incoming.inert=true;
    await transition.finished;
   }else{
    if(outgoing)await outgoing.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-5px)'}],{duration:140,easing:'ease-in',fill:'forwards'}).finished;
    move();
    if(incoming){incoming.inert=true;await incoming.animate([{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.22,1,.36,1)'}).finished}
   }
  }catch{if(lastKey!==nextKey)move()}
  finally{
   outgoing?.getAnimations().forEach(animation=>animation.cancel());
   if(outgoing)outgoing.inert=false;if(incoming)incoming.inert=false;
   if(restoreFocus&&!activeFocus.isConnected){const heading=incoming?.querySelector('h1');heading?.focus({preventScroll:true})}
   running=false;if(queued){queued=false;request()}
  }
 }
 function request(){clearTimeout(timer);timer=setTimeout(flush,Math.max(70,holdUntil-performance.now()))}
 return {request,hold(ms=1500,{animate=false}={}){holdUntil=Math.max(holdUntil,performance.now()+ms);forceTransition ||= animate;if(timer)request()}};
}
