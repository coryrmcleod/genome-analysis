import {analyzeFile} from './engine.js';
self.onmessage=async({data})=>{
  try{const report=await analyzeFile(data.file,data.catalog,data.options,p=>self.postMessage({type:'progress',...p}));self.postMessage({type:'complete',report});}
  catch(error){self.postMessage({type:'error',message:error.message});}
};
