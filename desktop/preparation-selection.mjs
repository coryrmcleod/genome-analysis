export function validatePreparationMode(includeAncestry){
  if(typeof includeAncestry!=='boolean')throw Error('Choose whether to include ancestry.');
  return includeAncestry;
}
export async function selectPreparationFiles(dialog,parent){
  const chosen={};
  for(const [key,title,extensions] of [['original','Choose original, unnormalized VCF (.vcf.gz)',['gz']],['alignment','Choose indexed CRAM or BAM',['cram','bam']],['reference','Choose matching GRCh38 FASTA',['fa','fasta']],['parent','Choose output folder',null]]){
    const options=extensions?{title,properties:['openFile'],filters:[{name:title,extensions}]}:{title,properties:['openDirectory','createDirectory']};
    const result=await dialog.showOpenDialog(parent,options);
    if(result.canceled)return null;
    if(!result.filePaths?.[0])throw Error('No file or folder selected.');
    chosen[key]=result.filePaths[0];
  }
  return chosen;
}
