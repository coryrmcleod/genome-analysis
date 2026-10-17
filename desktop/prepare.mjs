import {spawn} from 'node:child_process';
import {mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {validatePreparationMode} from './preparation-selection.mjs';
export function alignmentPreparationArguments({scripts,alignment,reference,linuxRoot,original},includeAncestry){
  validatePreparationMode(includeAncestry);
  return ['node',scripts+'/call-alignment.mjs','--alignment',alignment,'--reference',reference,'--build','GRCh38','--output',linuxRoot+'/Target-Calls','--missing-from',original,'--ancestry',String(includeAncestry)];
}

export function localPath(value){
  if(typeof value!=='string'||!path.win32.isAbsolute(value)||! /^[A-Za-z]:[\\/]/.test(value)||/[\r\n\0]/.test(value))throw Error('Choose a file on a local Windows drive.');
  return value;
}
export function preparationProgress(report){
  let completed=0;
  return {
    begin:stage=>report({percent:Math.floor(completed*100/14),stage}),
    complete:()=>{if(completed>=14)throw Error('Unexpected preparation step');completed++;}
  };
}
export async function prepare(inputs,resources,progress,includeAncestry){
  validatePreparationMode(includeAncestry);
  const steps=preparationProgress(progress);steps.begin('Checking selected files');
  for(const value of Object.values(inputs))localPath(value);
  if(!/\.vcf\.gz$/i.test(inputs.original)||! /\.(cram|bam)$/i.test(inputs.alignment))throw Error('Select a .vcf.gz and CRAM/BAM.');
  for(const file of [inputs.original,inputs.alignment,inputs.reference,inputs.reference+'.fai'])await access(file);
  steps.complete();
  const wsl=path.join(process.env.SystemRoot||'C:\\Windows','System32','wsl.exe');
  const run=(args)=>new Promise((resolve,reject)=>{
    const child=spawn(wsl,['-d','Ubuntu','--',...args],{shell:false,windowsHide:true});let output='';
    child.stdout.on('data',data=>{output=(output+data).slice(-24000);progress(String(data));});
    child.stderr.on('data',data=>{output=(output+data).slice(-24000);progress(String(data));});
    child.on('error',()=>reject(Error('WSL Ubuntu could not start. Install the processing prerequisites first.')));
    child.on('close',code=>code===0?resolve(output.trim()):reject(Error(output.slice(-2500)||'WSL processing failed.')));
  });
  const runStep=async(args,stage)=>{steps.begin(stage);const result=await run(args);steps.complete();return result;};
  progress('Checking processing tools…\n');
  for(const tool of ['node','samtools','bcftools'])await runStep([tool,'--version'],'Checking processing tools');
  const convert=async value=>{
    const converted=await runStep(['wslpath','-a',value.replaceAll('\\','/')],'Preparing local file paths');
    if(!converted.startsWith('/mnt/')||/[\r\n\0]/.test(converted))throw Error('Could not map selected path into WSL.');return converted;
  };
  const root=path.join(inputs.parent,'Genome-Analysis-'+randomUUID());steps.begin('Creating output folder');await mkdir(root);steps.complete();
  const linuxRoot=await convert(root),scripts=await convert(path.join(resources,'scripts'));
  const original=await convert(inputs.original),alignment=await convert(inputs.alignment),reference=await convert(inputs.reference);
  await runStep(alignmentPreparationArguments({scripts,alignment,reference,linuxRoot,original},includeAncestry),'Calling missing positions');
  await runStep(['node',scripts+'/supplement-vcf.mjs',original,linuxRoot+'/Target-Calls/panel.vcf',linuxRoot+'/Combined','genome'],'Combining VCF calls');
  await runStep(['node',scripts+'/normalize-analysis-vcf.mjs',linuxRoot+'/Combined/genome.supplemented.vcf.gz',reference,linuxRoot+'/Analysis-Ready'],'Normalizing and verifying the VCF');
  const final=path.join(root,'Analysis-Ready','genome.supplemented.analysis-ready.vcf.gz');steps.begin('Checking the finished file');await access(final);steps.complete();steps.begin('Complete');return final;
}
