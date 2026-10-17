import {app,BrowserWindow,Menu,dialog,ipcMain,session,shell} from 'electron';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createServer} from '../server.mjs';
import {prepare} from './prepare.mjs';
import {selectPreparationFiles,validatePreparationMode} from './preparation-selection.mjs';
import {checkSetup,installWindows,installTools} from './setup.mjs';
import {externalWebURL} from './external-links.mjs';
import {savedAnalysesDirectory,savedAnalysisDialogs} from './saved-analyses.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
let server,origin,preparation,busy=false;
const preferences={nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true};
function secure(win){
  const openExternal=value=>{
    const url=externalWebURL(value,origin);
    if(url)shell.openExternal(url).catch(()=>dialog.showMessageBox(win,{type:'error',message:'Unable to open the link in your default browser.',detail:url}));
  };
  win.webContents.setWindowOpenHandler(({url})=>{openExternal(url);return {action:'deny'};});
  win.webContents.on('will-navigate',(e,url)=>{e.preventDefault();openExternal(url);});
  win.webContents.on('will-attach-webview',e=>e.preventDefault());
}
function showPreparation(){
  if(preparation){preparation.focus();return;}
  preparation=new BrowserWindow({width:850,height:900,webPreferences:{...preferences,preload:path.join(here,'preload.cjs')}});
  secure(preparation);
  preparation.on('close',e=>{if(busy){e.preventDefault();dialog.showMessageBox(preparation,{message:'Processing or setup is running. Leave this window open until it finishes.'});}});
  preparation.on('closed',()=>{preparation=null;});
  preparation.loadFile(path.join(here,'prepare.html'));
}
function authorized(event){
  if(!preparation||event.sender!==preparation.webContents||event.senderFrame!==preparation.webContents.mainFrame)throw Error('Unauthorized request');
}
ipcMain.handle('prepare',async(event,includeAncestry)=>{
  authorized(event);if(busy)throw Error('A job is already running');busy=true;
  try{
    const setup=await checkSetup();if(setup.state!=='ready')return setup.message;
    validatePreparationMode(includeAncestry);
    const chosen=await selectPreparationFiles(dialog,preparation);
    if(!chosen)return 'Cancelled.';
    const resources=app.isPackaged?path.join(process.resourcesPath,'pipeline'):path.dirname(here);
    const output=await prepare(chosen,resources,text=>preparation?.webContents.send('progress',text),includeAncestry);
    return `Finished. Select this file in Analyze VCF:\n${output}`;
  }catch(error){return `Preparation stopped: ${error.message}`;}finally{busy=false;}
});
ipcMain.handle('setup',async(event,action)=>{
  authorized(event);if(busy)throw Error('A job is already running');busy=true;
  try{
    if(action==='check')return await checkSetup();
    if(!['windows','tools'].includes(action))throw Error('Unknown setup action');
    const message=action==='windows'?'Download and install Microsoft WSL and Ubuntu? Windows will request administrator approval. A restart may be needed.':'Download and install Node 22, SAMtools and BCFtools into your existing Ubuntu environment? This uses internet access and changes packages in that environment.';
    const consent=await dialog.showMessageBox(preparation,{type:'question',message,buttons:['Cancel','Install'],defaultId:0,cancelId:0});
    if(consent.response!==1)return {state:'unknown',message:'Installation cancelled. Check setup to continue.'};
    if(action==='windows')return {state:'unknown',message:await installWindows()};
    const resources=app.isPackaged?path.join(process.resourcesPath,'pipeline'):path.dirname(here);
    return await installTools(resources,text=>preparation?.webContents.send('progress',text));
  }catch(error){return {state:'unknown',message:error.message};}finally{busy=false;}
});
if(!app.requestSingleInstanceLock()){app.quit();}else app.whenReady().then(async()=>{
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin=`http://127.0.0.1:${server.address().port}`;
  const smoke=process.argv.includes('--smoke-test');
  const win=new BrowserWindow({show:!smoke,width:1400,height:950,webPreferences:{...preferences,preload:path.join(here,'home-preload.cjs')}});secure(win);
  const savedDirectory=savedAnalysesDirectory(app),savedFiles=savedAnalysisDialogs(savedDirectory,dialog);
  await savedFiles.ensure();
  function authorizeHome(event){
    if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||new URL(event.senderFrame.url).origin!==origin)throw Error('Unauthorized request');
  }
  ipcMain.handle('save-analysis',(event,value)=>{authorizeHome(event);return savedFiles.save(win,value);});
  ipcMain.handle('open-analysis',event=>{authorizeHome(event);return savedFiles.open(win);});
  ipcMain.handle('open-preparation',event=>{
    if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||new URL(event.senderFrame.url).origin!==origin)throw Error('Unauthorized request');
    showPreparation();
  });
  // Keep the standard Ctrl++ label; register Ctrl+= as an invisible alias.
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Genome Analysis',submenu:[{label:'Analyze VCF',click:()=>win.focus()},{label:'Open saved analyses folder',click:async()=>{try{await savedFiles.ensure();const message=await shell.openPath(savedDirectory);if(message)throw Error(message);}catch(e){dialog.showErrorBox('Unable to open saved analyses folder',e.message);}}},{type:'separator'},{role:'quit'}]},{label:'View',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomIn',accelerator:'CommandOrControl+=',visible:false,acceleratorWorksWhenHidden:true},{role:'zoomOut'}]}]));
  await win.loadURL(origin);
  if(smoke){
    const result=await win.webContents.executeJavaScript(`(async()=>{const wait=()=>new Promise(r=>setTimeout(r,100));let ready=false;for(let i=0;i<200;i++){if(document.getElementById('catalog-title').textContent.includes('SNP positions')){ready=true;break;}await wait();}if(!ready)throw Error('Catalog did not load');const bytes=await(await fetch('./synthetic-demo.vcf')).blob();const transfer=new DataTransfer();transfer.items.add(new File([bytes],'synthetic-demo.vcf'));const input=document.getElementById('file');input.files=transfer.files;input.dispatchEvent(new Event('change'));document.getElementById('analyze').click();for(let i=0;i<200;i++){if(document.getElementById('status').textContent.startsWith('Analysis complete.'))return {title:document.title,node:typeof require,body:document.body.innerText.length,syntheticAnalysis:true,catalog:document.getElementById('catalog-title').textContent,errors:document.getElementById('error').hidden?null:document.getElementById('error').textContent,scopeNotice:document.body.innerText.includes('not included in this public edition')};await wait();}throw Error('Synthetic analysis did not complete: '+document.getElementById('error').textContent);})()`);
    console.log('DESKTOP_SMOKE',JSON.stringify(result));
    server.close();app.exit(result.body>100&&result.node==='undefined'&&result.syntheticAnalysis&&result.errors===null&&result.scopeNotice?0:1);
  }
  app.on('second-instance',()=>win.focus());
  app.on('before-quit',e=>{if(busy)e.preventDefault();});
  app.on('window-all-closed',()=>{server.close();app.quit();});
}).catch(error=>{console.error(error);app.exit(1);});
