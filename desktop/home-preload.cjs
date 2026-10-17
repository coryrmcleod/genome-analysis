const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('genomeDesktop',{
  openPreparation:()=>ipcRenderer.invoke('open-preparation'),
  saveAnalysis:value=>ipcRenderer.invoke('save-analysis',value),
  openAnalysis:()=>ipcRenderer.invoke('open-analysis')
});
