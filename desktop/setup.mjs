import {spawn} from 'node:child_process';
import path from 'node:path';
const system=path.join(process.env.SystemRoot||'C:\\Windows','System32');
export function execute(exe,args,progress=()=>{},timeout=120000){
  return new Promise((resolve,reject)=>{
    const child=spawn(exe,args,{shell:false,windowsHide:true});let output='';
    const timer=setTimeout(()=>{child.kill();reject(Error('Setup check timed out. Restart Windows if requested, then check again.'));},timeout);
    for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{const text=String(data).replaceAll('\0','');output=(output+text).slice(-24000);progress(text);});
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('close',code=>{clearTimeout(timer);resolve({code,output:output.trim()});});
  });
}
const wsl=(args,progress,timeout)=>execute(path.join(system,'wsl.exe'),args,progress,timeout);
export async function checkSetup(run=wsl){
  try{
    const list=await run(['--list','--quiet']);
    if(list.code!==0)return {state:'windows',message:'Windows Linux support is not ready. Install WSL, restart if requested, then check again.'};
    if(!list.output.replaceAll('\0','').split(/\r?\n/).map(x=>x.trim()).includes('Ubuntu'))return {state:'windows',message:'Ubuntu is not installed for this Windows account. Use Install WSL and Ubuntu.'};
    const versions=[];
    for(const tool of ['node','samtools','bcftools']){
      const result=await run(['-d','Ubuntu','--',tool,'--version']);
      if(result.code!==0||tool==='node'&&!/^v(?:2[2-9]|[3-9]\d)\./.test(result.output))return {state:'tools',message:'Ubuntu is installed. Install or repair the processing tools (Node 22+, SAMtools and BCFtools).'};
      versions.push(result.output.split('\n')[0]);
    }
    return {state:'ready',message:'Processing tools are ready. '+versions.join('; ')};
  }catch(error){return {state:'windows',message:'Unable to check WSL: '+error.message};}
}
export async function installWindows(){
  // Fixed command only: no renderer text or user paths enter the elevated command.
  const command="$ErrorActionPreference='Stop'; try { $p=Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\\wsl.exe') -ArgumentList @('--install','-d','Ubuntu','--no-launch','--web-download') -Verb RunAs -WindowStyle Hidden -Wait -PassThru; exit $p.ExitCode } catch { Write-Error $_; exit 1 }";
  const result=await execute(path.join(system,'WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-Command',command],()=>{},1800000);
  return result.code===0||result.code===3010?'Windows installation step finished. Restart Windows if requested, then reopen this screen and check again.':`Windows installation did not finish (code ${result.code}). Administrator approval may have been cancelled. See Microsoft setup instructions or restart and check again.`;
}
export async function installTools(resources,progress){
  const installer=path.join(resources,'scripts','install-cram-tools.sh').replaceAll('\\','/');
  const mapped=await wsl(['-d','Ubuntu','-u','root','--','wslpath','-a',installer]);
  if(mapped.code!==0||!mapped.output.startsWith('/mnt/')||/[\r\n]/.test(mapped.output))throw Error('Ubuntu cannot start or map the installer. Restart Windows and check setup again.');
  const result=await wsl(['-d','Ubuntu','-u','root','--','bash',mapped.output],progress,1800000);
  if(result.code!==0)throw Error('Tool installation failed. Review the progress log, check your internet connection, and retry.');
  return checkSetup();
}
