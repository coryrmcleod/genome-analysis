// Reviewed same-condition replacements: newer publication and strict variant superset.
export const retiredScoreReplacements=Object.freeze({
 PGS000208:'PGS005210',
 PGS000209:'PGS005210',
 PGS003745:'PGS005208'
});
// A source conflict needs reconciliation before either deposited panel is usable.
export const withdrawnScoreDefinitions=Object.freeze({
 PGS003025:'The deposited coordinate and allele build conflicts with the complete FinnGen R4 source. Coordinate relabeling alone does not resolve all nine terms.',
 PGS003026:'The deposited coordinate and allele build conflicts with the complete FinnGen R4 source. Coordinate relabeling alone does not resolve all nine terms.'
});
export const withdrawnScoreReason=model=>withdrawnScoreDefinitions[model?.id]||null;
export function withdrawnScoreNotice(models=[]){
 const ids=[...new Set(models.filter(withdrawnScoreReason).map(m=>m.id))];
 return ids.length?'Source-definition withdrawal: '+ids.join(', ')+'. These historical definitions have unresolved coordinate/allele builds. Their raw sums, scenarios and ranks are hidden from current browsing and printed findings; the original saved records are retained for provenance.':'';
}
export function activeScoreModels(models=[]){
 const present=new Set(models.map(model=>model.id));
 return models.filter(model=>!withdrawnScoreReason(model)&&!present.has(retiredScoreReplacements[model.id]));
}
