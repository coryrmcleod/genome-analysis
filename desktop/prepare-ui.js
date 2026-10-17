const button=document.querySelector('#start'),status=document.querySelector('#status'),log=document.querySelector('#log');
const setupStatus=document.querySelector('#setup-status'),check=document.querySelector('#check'),windows=document.querySelector('#windows'),tools=document.querySelector('#tools');
const preparationButtons=[button];
const activity=document.querySelector('#activity');
let preparing=false,startedAt=0,activityTimer;
function stopActivity(){clearInterval(activityTimer);activityTimer=undefined;activity.hidden=true;}
function showActivity(){const seconds=Math.floor((Date.now()-startedAt)/1000);activity.textContent='Working · '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' elapsed';}
let ready=false;
async function setup(action){
  for(const control of [...preparationButtons,check,windows,tools])control.disabled=true;
  setupStatus.textContent=action==='check'?'Checking…':'Installing… This can take several minutes. Keep this window open.';
  try{const result=await window.genomePreparation.setup(action);ready=result.state==='ready';setupStatus.textContent=result.message;windows.hidden=result.state!=='windows';tools.hidden=result.state!=='tools';}
  catch(error){ready=false;setupStatus.textContent=error.message;}
  finally{check.disabled=false;windows.disabled=false;tools.disabled=false;for(const control of preparationButtons)control.disabled=!ready;}
}
check.onclick=()=>setup('check');windows.onclick=()=>setup('windows');tools.onclick=()=>setup('tools');
setup('check');
window.genomePreparation.onProgress(event=>{
  if(typeof event==='string'){log.textContent=(log.textContent+event).slice(-24000);log.scrollTop=log.scrollHeight;return;}
  if(!preparing||!event||!Number.isInteger(event.percent)||event.percent<0||event.percent>100||typeof event.stage!=='string')return;
  status.textContent='Preparing… '+event.stage;
  if(activityTimer===undefined){startedAt=Date.now();activity.hidden=false;showActivity();activityTimer=setInterval(showActivity,1000);}
});
button.addEventListener('click',async()=>{for(const control of [...preparationButtons,check,windows,tools])control.disabled=true;log.textContent='';preparing=true;stopActivity();status.textContent='Preparing…';try{status.textContent=await window.genomePreparation.start(true);}catch{status.textContent='Unable to start preparation.';}finally{preparing=false;stopActivity();check.disabled=false;windows.disabled=false;tools.disabled=false;for(const control of preparationButtons)control.disabled=!ready;}});
