// An interpretation status is not proof that a genotype record was observed.
const legacyObserved=new Set(['Called','No call','Quality limited','Allele / ID mismatch','Conflicting records','Duplicate records','Unsupported call','Strand ambiguous','Model allele mismatch','Effect orientation unresolved']);
export function recordPresence(row){
 if(typeof row.recordObserved==='boolean')return row.recordObserved;
 if(row.recordObserved===null)return null;
 if(row.status==='Not observed')return false;
 return legacyObserved.has(row.status)?true:null;
}
export function recordCoverage(rows){
 const counts={observed:0,notObserved:0,unassessed:0,total:rows.length};
 for(const row of rows){const present=recordPresence(row);counts[present===true?'observed':present===false?'notObserved':'unassessed']++;}
 return counts;
}
export function recordIssue(row){return !['Called','Not observed','No call','Normalization required','Unsupported input','Unsupported build'].includes(row.status);}
