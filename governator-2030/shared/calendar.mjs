export function googleCalendarUrl({title,start,end,location='',details='',allDay=false}){
 const stamp=value=>{const date=new Date(value);if(Number.isNaN(date.getTime()))throw Error('Invalid calendar date');return date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')};
 let dates;
 if(allDay){if(!/^\d{4}-\d{2}-\d{2}$/.test(start))throw Error('Invalid date');const next=new Date(start+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);dates=start.replaceAll('-','')+'/'+next.toISOString().slice(0,10).replaceAll('-','')}
 else{const finish=end||new Date(new Date(start).getTime()+30*60*1000).toISOString();if(new Date(finish)<=new Date(start))throw Error('End must follow start');dates=stamp(start)+'/'+stamp(finish)}
 return 'https://calendar.google.com/calendar/render?'+new URLSearchParams({action:'TEMPLATE',text:title,dates,ctz:'Europe/Vienna',location,details}).toString();
}
export function pendingApprovals(state){const e=state.evidence;return [
 {id:'lesson_approval',title:'Driving lessons',detail:e.training?'Your school has confirmed your completed lessons.':e.lesson_approval?'You can start your lessons. Your school will confirm when they are completed.':'Your school needs to approve you before lessons can begin.',complete:!!e.lesson_approval,status:e.training?'Completed':e.lesson_approval?'Approved to start':'Awaiting school approval',state:e.training?'complete':e.lesson_approval?'ready':'waiting'},
 {id:'theory',title:'Theory exam',detail:e.theory?'Passed':e.training?'Your examiner will send your theory result automatically.':'Your school must first confirm that you have completed your lessons.',complete:!!e.theory,status:e.theory?'Passed':e.training?'Awaiting exam result':'Waiting for lessons',state:e.theory?'complete':'waiting'},
 {id:'practical',title:'Driving exam',detail:e.practical?'Passed':e.theory?'Your examiner will send your driving-test result automatically.':'You need to pass your theory exam before this step can begin.',complete:!!e.practical,status:e.practical?'Passed':e.theory?'Awaiting exam result':'Waiting for theory',state:e.practical?'complete':'waiting'}
]}
