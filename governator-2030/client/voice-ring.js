// Animated line-and-particle ring; audio levels come from the existing voice session.
export function startVoiceRings({mode,volume}){
 const contexts=new WeakMap(),reduced=matchMedia('(prefers-reduced-motion: reduce)');let lastFrame=0,energy=.12;
 function frame(now){requestAnimationFrame(frame);if(document.hidden||now-lastFrame<32)return;lastFrame=now;
  const state=mode();let level=0;try{level=volume()||0}catch{}
  energy+=(Math.min(1,Math.max(0,level))+(state==='speaking'?.35:state==='listening'?.16:.05)-energy)*.12;
  document.querySelectorAll('.voice-ring-canvas').forEach(canvas=>{
   const size=canvas.clientWidth;if(!size)return;const ratio=Math.min(devicePixelRatio||1,2),pixels=Math.round(size*ratio);
   if(canvas.width!==pixels||canvas.height!==pixels){canvas.width=pixels;canvas.height=pixels}
   let ctx=contexts.get(canvas);if(!ctx){ctx=canvas.getContext('2d');if(!ctx)return;contexts.set(canvas,ctx)}
   const time=reduced.matches?0:now*.0008,centre=size/2,radius=size*.36,amplitude=radius*(reduced.matches?.035:.11+energy*.16);
   ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,size,size);ctx.translate(centre,centre);
   const glow=ctx.createRadialGradient(0,0,radius*.65,0,0,radius*1.25);glow.addColorStop(0,'rgba(238,36,105,0)');glow.addColorStop(.6,'rgba(238,36,105,.035)');glow.addColorStop(1,'rgba(238,36,105,0)');ctx.fillStyle=glow;ctx.fillRect(-centre,-centre,size,size);
   for(let layer=0;layer<25;layer++){
    const fraction=layer/24;ctx.beginPath();
    for(let point=0;point<=180;point++){
     const angle=point/180*Math.PI*2;
     const lobe=Math.sin(angle*3+time*1.8)*Math.sin(angle*2-time*.7);
     const wave=Math.sin(angle*7+time*3+fraction*4.5)*.42+Math.sin(angle*3-time*2+fraction*5)*.58;
     const r=radius+amplitude*(wave+lobe*.7)*(fraction-.35)*2-radius*.14*fraction;
     const x=Math.cos(angle)*r,y=Math.sin(angle)*r;
     point?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
    ctx.closePath();ctx.strokeStyle=`rgba(229,24,93,${.12+(1-fraction)*.48})`;ctx.lineWidth=layer===0?1.45:.55;ctx.shadowBlur=layer<3?size*.04:0;ctx.shadowColor='#ef2e78';ctx.stroke();
   }
   ctx.shadowBlur=0;
   for(let ring=0;ring<8;ring++)for(let point=0;point<70;point++){
    const angle=point/70*Math.PI*2+time*.15+ring*.03,r=radius*(.55+ring*.048)+Math.sin(angle*5+time*2+ring*.5)*amplitude*.45;
    ctx.fillStyle=`rgba(234,36,103,${.07+ring*.018})`;ctx.beginPath();ctx.arc(Math.cos(angle)*r,Math.sin(angle)*r,Math.max(.35,size*.0022),0,Math.PI*2);ctx.fill();
   }
  });
 }
 requestAnimationFrame(frame);
}
