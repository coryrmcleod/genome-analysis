export const SAVED_ANALYSIS_BYTE_LIMIT=150_000_000;

export function serializeAnalysis(value,limit=SAVED_ANALYSIS_BYTE_LIMIT){
 // Formatting whitespace can nearly double a full report. Compact JSON retains
 // every field, scoring term and string exactly while fitting the open-file limit.
 const text=JSON.stringify(value);
 if(typeof text!=='string')throw Error('No analysis is available to save.');
 if(new TextEncoder().encode(text).byteLength>limit)throw Error('This saved analysis exceeds 150 MB. No file was written.');
 return text;
}
