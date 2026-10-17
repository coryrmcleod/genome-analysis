import {gunzipSync} from 'node:zlib';
import {chainIntervalMappings} from './assembly-chain.mjs';
import {validateAssemblyReversal} from '../public/pgs-build-alleles.js';
export async function verifyAssemblyReversal(id,mappings,download){
 const e={version:1,method:'reciprocal-unique-chain-and-exact-flanks',flankSize:100};
 for(const build of ['GRCh37','GRCh38']){
  const m=mappings[build],hg=build==='GRCh37'?'hg19':'hg38',name=build==='GRCh37'?'hg19ToHg38':'hg38ToHg19';
  const chain=await download(`https://hgdownload.soe.ucsc.edu/goldenPath/${hg}/liftOver/${name}.over.chain.gz`,name+'.over.chain.gz');
  const host=build==='GRCh37'?'grch37.rest.ensembl.org':'rest.ensembl.org';
  const sequence=await download(`https://${host}/sequence/region/human/${m.chrom}:${m.position-100}..${m.position+100}:1?content-type=application/json`,`${id}-${build}-reversal-sequence.json`);
  e[build]={chainHits:chainIntervalMappings(gunzipSync(chain.bytes).toString(),'chr'+m.chrom,m.position-101,m.position+100),sequence:JSON.parse(sequence.bytes),chainSource:{url:chain.url,sha256:chain.sha256},sequenceSource:{url:sequence.url,sha256:sequence.sha256}};
 }
 return validateAssemblyReversal(e,mappings);
}
