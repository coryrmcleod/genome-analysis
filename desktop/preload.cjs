const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('genomePreparation',{
  start:includeAncestry=>ipcRenderer.invoke('prepare',includeAncestry),
  setup:action=>ipcRenderer.invoke('setup',action),
  onProgress:callback=>ipcRenderer.on('progress',(_event,text)=>callback(text))
});
