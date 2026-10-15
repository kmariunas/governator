// Keep required choices visible even when the agent only asks the question aloud.
// The agent can still compose and replace these components through its generic tools.
export function createJourneyController(engine){
 let queue=Promise.resolve();
 async function presentNext(){
  const s=engine.snapshot();if(s.journey_id!=='drivers_license'||s.actions.book_medical||s.review_step)return null;
  let key=!s.preferences.transmission?'transmission':!s.selections.school_id?'school_id':!s.selections.medical_slot_id?'medical_slot_id':null;
  if(!key||s.ui?.selection_key===key&&!s.ui.selected?.length)return null;
  if(key==='transmission')return engine.call('show_cards',{title:'Manual or automatic?',selection_key:key,cards:[{id:'manual',title:'Manual',description:'Drive manual and automatic cars',icon:'car'},{id:'automatic',title:'Automatic',description:'Automatic cars only',icon:'car'}]});
  if(key==='school_id'){const r=await engine.call('find_services',{service_type:'school'});if(!r.ok)return r;return engine.call('show_map',{title:`Choose a driving school in ${s.preferences.location}.`,selection_key:key,centre:r.centre,markers:r.services.map(p=>({provider_id:p.id}))})}
  const r=await engine.call('find_services',{service_type:'doctor'});if(!r.ok)return r;
  const eligible=new Set(r.services.filter(p=>p.authorised&&p.independent).map(p=>p.id));
  const slots=[...new Map(r.slots.filter(slot=>slot.available&&eligible.has(slot.provider_id)).sort((a,b)=>a.start.localeCompare(b.start)).map(slot=>[slot.start,slot])).values()];
  return engine.call('show_calendar',{title:'What time works best for you?',selection_key:key,auto_assign_doctor:true,slot_ids:slots.map(slot=>slot.id)});
 }
 function call(name,args={}){const run=async()=>{
  const reviewing=engine.snapshot().review_step;
  const result=await engine.call(name,args);if(!result.ok)return result;
  if(reviewing&&name==='record_selection')engine.finishReview();
  if(name==='get_journey'&&args.journey_id||name==='record_selection'||name==='set_preferences'){
   let booking;if(name==='record_selection'&&args.selection_key==='medical_slot_id'){booking=await engine.call('perform_action',{action:'book_medical'});if(!booking.ok)return {...result,ok:false,error:booking.error,journey:engine.summary()}}
   const next=await presentNext();
   if(next&&!next.ok)return {...result,journey:engine.summary(),presentation_error:next.error};
   const ui=engine.snapshot().ui;
   return {...result,...(booking?{booking:booking.result}:{}),journey:engine.summary(),current_presentation:ui,instructions:'The app has already displayed current_presentation. If booking is present, the appointment is already confirmed: briefly state doctor, date and time, then wait for the provider. Otherwise explain the visible choices and await the citizen. Do not repeat an already recorded selection. You may customize the current component using display tools.'};
  }
  return result;
 };const result=queue.then(run,run);queue=result.then(()=>{},()=>{});return result}
 async function revisitStep(id){
  const run=async()=>{
   const original=engine.beginReview(id),s=engine.snapshot();
   const key={preferences:'transmission',school:'school_id',booking:'medical_slot_id',followup:'followup_approval'}[id];
   if(original){const base={title:original.title,selection_key:original.selection_key,selection_mode:original.selection_mode};
    if(original.type==='cards')return engine.call('show_cards',{...base,cards:original.options});
    if(original.type==='map')return engine.call('show_map',{...base,centre:original.centre,zoom:original.zoom,markers:original.options.map(p=>({provider_id:p.id,label:p.title}))});
    if(original.type==='calendar')return engine.call('show_calendar',{...base,auto_assign_doctor:original.auto_assign_doctor,slot_ids:original.options.map(slot=>slot.id)});
   }
   if(id==='preferences')return engine.call('show_cards',{title:'Manual or automatic?',selection_key:key,cards:[{id:'manual',title:'Manual',description:'Drive manual and automatic cars',icon:'car'},{id:'automatic',title:'Automatic',description:'Automatic cars only',icon:'car'}]});
   if(id==='school'){const r=await engine.call('find_services',{service_type:'school'});return engine.call('show_map',{title:'Choose a driving school in '+s.preferences.location+'.',selection_key:key,centre:r.centre,markers:r.services.map(p=>({provider_id:p.id}))})}
   if(id==='booking'){const r=await engine.call('find_services',{service_type:'doctor'}),eligible=new Set(r.services.filter(p=>p.independent&&p.authorised).map(p=>p.id));const slots=[...new Map(r.slots.filter(slot=>eligible.has(slot.provider_id)).map(slot=>[slot.start,slot])).values()];const chosen=r.slots.find(slot=>slot.id===s.selections.medical_slot_id);if(chosen){const i=slots.findIndex(slot=>slot.start===chosen.start);if(i>=0)slots[i]=chosen}return engine.call('show_calendar',{title:'What time works best for you?',selection_key:key,auto_assign_doctor:true,slot_ids:slots.map(slot=>slot.id)})}
   return {ok:true,journey:engine.summary()};
  };const result=queue.then(run,run);queue=result.then(()=>{},()=>{});return result;
 }
 return {call,revisitStep,endReview(){engine.endReview()}};
}
