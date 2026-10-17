import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {savedAnalysesDirectory,savedAnalysisDialogs} from '../desktop/saved-analyses.mjs';

test('desktop saves and opens JSON in a persistent per-user folder with cancellation and safe replacement',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'ga-saved-')),directory=path.join(root,'Saved Analyses'),destination=path.join(directory,'example.json');
 const options=[];let cancel=false;
 const dialogs={showSaveDialog:async(_win,o)=>{options.push(o);return {canceled:cancel,filePath:destination};},showOpenDialog:async(_win,o)=>{options.push(o);return {canceled:cancel,filePaths:[destination]};}};
 const files=savedAnalysisDialogs(directory,dialogs);
 try{
  assert.equal(savedAnalysesDirectory({getPath:()=>root},{LOCALAPPDATA:root},'win32'),path.join(root,'Genome Analysis','Saved Analyses'));
  await files.save(null,{name:'example.json',text:'{"synthetic":true}'});
  assert.equal(options[0].defaultPath,destination);
  assert.deepEqual(await files.open(null),{name:'example.json',text:'{"synthetic":true}'});
  assert.equal(options[1].defaultPath,directory);
  await files.save(null,{name:'example.json',text:'{"synthetic":2}'});
  assert.equal(await readFile(destination,'utf8'),'{"synthetic":2}');
  await assert.rejects(files.save(null,{name:'../escape.json',text:'{}'}),/Invalid/);
  await assert.rejects(files.save(null,{name:'example.json',text:'broken'}));
  assert.equal(await readFile(destination,'utf8'),'{"synthetic":2}');
  cancel=true;
  assert.equal(await files.save(null,{name:'example.json',text:'{}'}),null);
  assert.equal(await files.open(null),null);
  assert.deepEqual(await readdir(directory),['example.json']);
  cancel=false;await writeFile(destination,'not JSON');await assert.rejects(files.open(null));
 }finally{if(path.dirname(root)!==path.resolve(os.tmpdir())||!path.basename(root).startsWith('ga-saved-'))throw Error('Unsafe test cleanup');await rm(root,{recursive:true,force:true});}
});
