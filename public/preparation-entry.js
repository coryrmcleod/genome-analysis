const preparationButton=document.getElementById('open-preparation');
if(typeof window.genomeDesktop?.openPreparation==='function'){
  preparationButton.hidden=false;
  document.getElementById('preparation-browser-note').hidden=true;
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('#open-preparation, [data-open-preparation]');
  if(!button)return;
  if(typeof window.genomeDesktop?.openPreparation!=='function'){
    document.getElementById('cram-workflow').scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  button.disabled=true;
  try{await window.genomeDesktop.openPreparation();}
  catch{
    const message=document.getElementById('preparation-error');
    message.hidden=false;
    message.textContent='Unable to open VCF preparation. Please reopen the desktop app.';
    message.scrollIntoView({behavior:'smooth',block:'center'});
  }
  finally{button.disabled=false;}
});
