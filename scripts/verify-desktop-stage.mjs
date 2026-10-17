// Read-only verification of known application/reference directories, never personal inputs.
import {readdir,readFile,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function verifyDirectoryCopy(source,destination){
 let checked=0;
 async function visit(relative=''){
  for(const entry of await readdir(path.join(source,relative),{withFileTypes:true})){
   const name=path.join(relative,entry.name),from=path.join(source,name),to=path.join(destination,name);
   if(entry.isSymbolicLink())throw Error('Unexpected source symlink: '+name);
   let target;try{target=await lstat(to);}catch{throw Error('Missing staged path: '+name);}
   if(target.isSymbolicLink())throw Error('Unexpected staged symlink: '+name);
   if(entry.isDirectory()){if(!target.isDirectory())throw Error('Staged directory mismatch: '+name);await visit(name);}
   else if(entry.isFile()){
    if(!target.isFile())throw Error('Staged file mismatch: '+name);
    const bytes=await Promise.all([readFile(from),readFile(to)]),hash=b=>createHash('sha256').update(b).digest('hex');
    if(hash(bytes[0])!==hash(bytes[1]))throw Error('Staged contents differ: '+name);checked++;
   }else throw Error('Unsupported source entry: '+name);
  }
 }
 await visit();return checked;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url));let checked=0;
 for(const [stage,directories] of [['desktop-app',['public','desktop']],['desktop-pipeline',['public','scripts']]]){
  for(const relative of directories)checked+=await verifyDirectoryCopy(path.join(root,relative),path.join(root,'work',stage,relative));
 }
 const server=await readFile(path.join(root,'server.mjs')),stagedServer=await readFile(path.join(root,'work/desktop-app/server.mjs'));
 if(!server.equals(stagedServer))throw Error('Staged server differs');
 console.log(JSON.stringify({checkedFiles:checked+1,status:'Source, runtime, public reference and certified proof copies match',installerVerified:false}));
}
