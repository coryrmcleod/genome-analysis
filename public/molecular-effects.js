// ClinVar MC terms describe sequence consequences, not clinical severity or trait direction.
export function parseMolecularConsequences(value){
 if(!value||value==='.')return [];
 const terms=value.split(',').map(item=>{const match=/^(SO:\d{7})\|([A-Za-z0-9_-]+)$/.exec(item);if(!match)throw Error('Invalid ClinVar molecular consequence');return {id:match[1],term:match[2]};});
 return [...new Map(terms.map(t=>[t.id+'|'+t.term,t])).values()];
}
export function validateMolecularConsequences(terms){
 if(terms===undefined)return;
 if(!Array.isArray(terms)||terms.length>100)throw Error('Invalid molecular consequence list');
 for(const t of terms)if(!/^SO:\d{7}$/.test(t.id)||!/^[A-Za-z0-9_-]{1,100}$/.test(t.term))throw Error('Invalid molecular consequence identity');
}
const definitions={
 'SO:0001583':['missense_variant','Changes an encoded amino acid.'],
 'SO:0001587':['stop_gained','Introduces an earlier protein stop signal.'],
 'SO:0001589':['frameshift_variant','Shifts the protein reading frame.'],
 'SO:0001574':['splice_acceptor_variant','Changes a core splice-acceptor site.'],
 'SO:0001575':['splice_donor_variant','Changes a core splice-donor site.'],
 'SO:0001630':['splice_region_variant','Falls near a splice junction.'],
 'SO:0001821':['inframe_insertion','Adds coding bases while retaining the reading frame.'],
 'SO:0001822':['inframe_deletion','Removes coding bases while retaining the reading frame.'],
 'SO:0001819':['synonymous_variant','Leaves the encoded amino acid unchanged.'],
 'SO:0002012':['start_lost','Changes the usual protein start signal.'],
 'SO:0001578':['stop_lost','Removes the usual protein stop signal.'],
 'SO:0001627':['intron_variant','Falls within an intron.'],
 'SO:0001582':['initiator_codon_variant','Changes a base in the first codon; this term alone does not establish whether protein initiation is lost.'],
 'SO:0001820':['inframe_indel','Changes the coding sequence without shifting its reading frame.'],
 'SO:0001623':['5_prime_UTR_variant','Falls in the untranslated portion before the coding sequence of an annotated transcript.'],
 'SO:0001624':['3_prime_UTR_variant','Falls in the untranslated portion after the coding sequence of an annotated transcript.'],
 'SO:0001619':['non_coding_transcript_variant','Falls within an annotated RNA transcript that does not encode a protein.'],
 'SO:0002153':['genic_upstream_transcript_variant','Falls before one transcript while remaining inside the gene region defined by alternative transcripts.'],
 'SO:0002152':['genic_downstream_transcript_variant','Falls after one transcript while remaining inside the gene region defined by alternative transcripts.']
};
export function explainMolecularConsequence(t){
 const known=definitions[t.id];return known&&(known[0]===t.term||t.id==='SO:0001587'&&t.term==='nonsense'||t.id==='SO:0001619'&&t.term==='non-coding_transcript_variant')?known[1]:'Source consequence term; see the original record for details.';
}
export const MOLECULAR_EFFECT_SCOPE='Source annotations may differ between transcripts. This summary does not identify the relevant transcript or prove an effect in your cells, disease severity, or higher/lower trait values.';
export const MOLECULAR_EFFECT_SOURCE='https://www.ensembl.org/info/genome/variation/prediction/predicted_data.html';
export const SEQUENCE_ONTOLOGY_SOURCE='https://github.com/The-Sequence-Ontology/SO-Ontologies/blob/master/Ontology_Files/so.obo';
