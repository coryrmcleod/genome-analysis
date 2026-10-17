import {mkdir,open,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const limit=150_000_000;
export function savedAnalysesDirectory(app,env=process.env,platform=process.platform){
 const base=platform==='win32'?(env.LOCALAPPDATA||path.join(app.getPath('home'),'AppData','Local')):app.getPath('userData');
 return path.join(base,...(platform==='win32'?['Genome Analysis']:[]),'Saved Analyses');
}
export function savedAnalysisDialogs(directory,dialog){
 const ensure=()=>mkdir(directory,{recursive:true});
 return {
  async save(win,{name,text}={}){
   if(typeof name!=='string'||!/^[a-zA-Z0-9_-]+\.json$/.test(name)||typeof text!=='string'||Buffer.byteLength(text)>limit)throw Error('Invalid saved analysis or file name (maximum 150 MB).');
   JSON.parse(text);await ensure();
   const result=await dialog.showSaveDialog(win,{title:'Save analysis',defaultPath:path.join(directory,name),filters:[{name:'Saved analysis',extensions:['json']}],properties:['showOverwriteConfirmation']});
   if(result.canceled||!result.filePath)return null;
   const destination=result.filePath;
   const temporary=path.join(path.dirname(destination),'.genome-save-'+randomUUID()+'.tmp');
   try{await writeFile(temporary,text,{flag:'wx'});await rename(temporary,destination);}finally{await rm(temporary,{force:true});}
   return {path:destination};
  },
  async open(win){
   await ensure();
   const result=await dialog.showOpenDialog(win,{title:'Open saved analysis',defaultPath:directory,filters:[{name:'Saved analysis',extensions:['json']}],properties:['openFile']});
   if(result.canceled||!result.filePaths?.length)return null;
   const selected=result.filePaths[0],file=await open(selected,'r');
   try{
    const info=await file.stat();if(!info.isFile()||info.size>limit)throw Error('Saved analysis exceeds 150 MB or is not a file.');
    const bytes=Buffer.alloc(info.size+1);let length=0;
    while(length<bytes.length){const {bytesRead}=await file.read(bytes,length,bytes.length-length,length);if(!bytesRead)break;length+=bytesRead;}
    if(length!==info.size)throw Error('Saved analysis changed while being opened.');
    const text=bytes.subarray(0,length).toString('utf8');JSON.parse(text);
    return {name:path.basename(selected),text};
   }finally{await file.close();}
  },
  ensure
 };
}
