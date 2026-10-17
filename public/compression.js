function blockSize(bytes){
  if(bytes.length<12||bytes[0]!==31||bytes[1]!==139||bytes[2]!==8||!(bytes[3]&4))return null;
  const xlen=bytes[10]|bytes[11]<<8;if(bytes.length<12+xlen)return null;
  for(let i=12;i+4<=12+xlen;){const len=bytes[i+2]|bytes[i+3]<<8;if(i+4+len>12+xlen)throw Error('Invalid BGZF extra field.');if(bytes[i]===66&&bytes[i+1]===67&&len===2)return (bytes[i+4]|bytes[i+5]<<8)+1;i+=4+len;}
  return null;
}
async function* bgzfChunks(file){
  const reader=file.stream().getReader();let pending=new Uint8Array(),done=false;
  async function fill(n){while(pending.length<n&&!done){const next=await reader.read();done=next.done;if(next.value){const joined=new Uint8Array(pending.length+next.value.length);joined.set(pending);joined.set(next.value,pending.length);pending=joined;}}}
  try{while(true){await fill(12);if(!pending.length&&done)return;if(pending.length<12)throw Error('Truncated BGZF header.');await fill(12+(pending[10]|pending[11]<<8));const size=blockSize(pending);if(size===null||size<26||size>65536)throw Error('Invalid BGZF block.');await fill(size);if(pending.length<size)throw Error('Truncated BGZF block.');const compressed=pending.slice(0,size);pending=pending.slice(size);
    // DecompressionStream verifies each member's gzip CRC and uncompressed size.
    const block=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();if(block.byteLength>65536)throw Error('BGZF block exceeds 64 KiB.');if(block.byteLength)yield new Uint8Array(block);
  }}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export async function inputStream(file){
  if(!/\.gz$/i.test(file.name))return file.stream();
  if(typeof DecompressionStream==='undefined')throw Error('Gzip is unavailable in this browser. Decompress your file locally first.');
  const head=new Uint8Array(await file.slice(0,65536).arrayBuffer());
  if(blockSize(head)===null)return file.stream().pipeThrough(new DecompressionStream('gzip'));
  const iterator=bgzfChunks(file);
  return new ReadableStream({async pull(controller){try{const {done,value}=await iterator.next();if(done)controller.close();else controller.enqueue(value);}catch(e){controller.error(e);}},async cancel(){await iterator.return();}});
}
