import {validateAncestryReference} from './ancestry.js';
import {validateAncestryNumericalVerification} from './ancestry-numerical-verification.js';
// Fingerprint exact reference bytes; optional numerical evidence must bind them.
export async function loadAncestryReference(response,evidenceResponse=null){
 if(!response.ok)throw Error('Public ancestry reference unavailable');
 const bytes=await response.arrayBuffer();
 const panel=validateAncestryReference(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const {numericalVerification:ignored,...reference}=panel;
 const loaded={...reference,referenceSha256:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};
 if(evidenceResponse?.ok){try{const evidence=await evidenceResponse.json();loaded.numericalVerification=validateAncestryNumericalVerification(evidence,loaded.referenceSha256,loaded.validation.heldOutSamples);}catch{ /* Optional evidence cannot disable the verified reference. */ }}
 return loaded;
}
