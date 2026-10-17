// Study directions describe the named allele and endpoint, never a personal prediction.
export const PGS_METHODS = 'https://pgsc-calc.readthedocs.io/en/latest/explanation/geneticancestry.html';
const lactaseSource = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6723957/';
const curated = {
  rs9939609: {allele:'A',trait:'Body mass',direction:'higher',label:'Associated with higher BMI',text:'The A allele was associated with higher BMI and body-fat measures in a Danish population study. Physical activity modified the association.',source:'https://pubmed.ncbi.nlm.nih.gov/17942823/'},
  rs7903146: {allele:'T',trait:'Type 2 diabetes susceptibility',direction:'higher',label:'Higher diabetes susceptibility',text:'The T allele is associated with greater susceptibility to type 2 diabetes in population studies. This is a relative association, not your probability of developing diabetes.',source:'https://pubmed.ncbi.nlm.nih.gov/17697858/'},
  rs10455872: {allele:'G',trait:'Lipoprotein(a)',direction:'higher',label:'Associated with higher Lp(a)',text:'The G allele is associated with higher blood lipoprotein(a) levels. A genotype does not supply your measured Lp(a) concentration.',source:'https://pubmed.ncbi.nlm.nih.gov/31188921/'},
  rs4244285: {allele:'A',trait:'Drug metabolism',direction:'lower',label:'Reduced enzyme function',text:'The A splice variant is used to define the CYP2C19 *2 no-function allele. This describes enzyme function; it is not a universal lower drug-effect prediction.',source:'https://files.cpicpgx.org/data/guideline/publication/PPI/2020/32770672.pdf',caveat:'Other variants and haplotypes determine the overall metabolizer phenotype. This app does not assign a star-allele diplotype or medication dose.'},
  rs12248560: {allele:'T',trait:'Drug metabolism',direction:'higher',label:'Increased expression marker',text:'The T promoter variant is used in the definition of the increased-function CYP2C19 *17 allele. It does not by itself establish an overall rapid-metabolizer phenotype.',source:'https://files.cpicpgx.org/data/guideline/publication/PPI/2020/32770672.pdf',caveat:'Other variants and haplotypes can change function. Different drugs have different consequences; this is not a medication or dose recommendation.'}
};
export function effectDirection(r) {
  const a = r.association;
  if (a) {
    const raw = typeof a.reportedEffect === 'string' ? a.reportedEffect.trim() : '';
    // Require an explicit, positive magnitude and an unambiguous direction word.
    // A bare number, p-value, or unspecified disease coding is not a risk estimate.
    const match = raw.match(/^((?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)\s+(.+?)\s+(increase|decrease)$/i);
    if (a.reportedAllele === r.effectAllele && a.trait === r.trait && match && Number.isFinite(Number(match[1])) && Number(match[1]) > 0 && !/increase|decrease/i.test(match[2])) {
      const direction = match[3].toLowerCase() === 'increase' ? 'higher' : 'lower';
      return {direction, label: `Study: ${direction} (unreviewed)`, allele: r.effectAllele,
        text: `The linked study reports allele ${r.effectAllele} with ${direction} values on its outcome scale for “${a.trait}”: ${raw}.`,
        caveat: 'Study-reported direction; independent allele/strand review is pending. For disease endpoints, outcome coding and effect scale need review before translating this into higher or lower odds. Study units may be transformed; this is not a predicted change in your measurement.',
        source: `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`, basis: 'API-reported study effect', raw};
    }
    return {direction: 'unknown', label: 'Direction unavailable', allele: r.effectAllele,
      text: 'The linked association does not supply an unambiguous increase/decrease effect for the tracked allele.',
      caveat: 'No direction is inferred from the gene name, p-value, allele frequency, or the API term “risk allele”.', source: `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`, raw};
  }
  const entry=curated[r.id];
  if(entry && entry.allele===r.effectAllele && entry.trait===r.trait) return {...entry,basis:'Sourced allele-specific summary',caveat:entry.caveat||'This population association does not predict your overall trait value. Effects depend on other variants, environment, and the population studied.'};
  if (r.id === 'rs4988235' && r.effectAllele === 'A' && r.trait === 'Lactase persistence') return {
    direction: 'higher', label: 'Supports lactase persistence', allele: 'A',
    text: 'The genomic-forward A allele is associated with persistence of lactase production into adulthood, especially in studied European-descending populations. It corresponds to the −13910 T allele on the opposite strand.',
    caveat: 'One or two A copies support this dominant marker association; two copies are not interpreted as twice the effect. Other persistence variants exist, and this marker does not establish whether dairy causes symptoms.',
    source: lactaseSource, basis: 'Published marker association'};
  if (['rs429358', 'rs7412'].includes(r.id)) return {direction:'context', label:'Haplotype dependent', text:'These APOE sites must be considered together as haplotypes. This app does not assign a higher/lower disease direction to either isolated site.', caveat:'No APOE type or combined disease prediction is inferred.'};
  if (r.trait === 'Cognition research') return {direction:'context', label:'No consistent trait direction', text:'This catalog does not establish a consistent higher/lower cognitive-performance association for this allele.', caveat:'A molecular effect is not a prediction of memory, intelligence, or performance.'};
  return {direction:'unknown', label:'Direction not curated', text:'An allele-specific higher/lower direction has not yet been curated for this exact trait. See the existing evidence summary below.', caveat:'The absence of a direction does not mean the allele has no effect.'};
}

export function personalDirection(r, effect = effectDirection(r)) {
  if (r.status !== 'Called' || !Number.isInteger(r.copies)) return `Your direction is not interpreted: ${r.status}. The study association below is background information only.`;
  if (r.copies === 0) return `Your call contains no ${r.effectAllele} tracked allele. This does not establish an opposite effect or your overall trait level.`;
  const count = `Your call contains ${r.copies} ${r.effectAllele} ${r.copies === 1 ? 'copy' : 'copies'}.`;
  if(r.association) return `${count} Personal trait direction is withheld while study allele alignment and outcome coding await review. The reported study direction is shown separately.`;
  if (effect.label === 'Supports lactase persistence') return `${count} This supports the lactase-persistence marker association, without predicting symptoms or a percentile.`;
  if (effect.direction === 'higher' || effect.direction === 'lower') return `${count} Allele association: ${effect.label.toLowerCase()}. This does not establish your overall trait level.`;
  return `${count} ${effect.label}.`;
}

// Families organize related endpoints; exact study traits remain visible in every row.
export function traitFamily(r) {
  const t = r.trait.toLowerCase();
  if (/systolic blood pressure/.test(t)) return 'Systolic blood pressure';
  if (/diastolic blood pressure/.test(t)) return 'Diastolic blood pressure';
  if (/hba1c|hemoglobin a1c|glycated haemoglobin/.test(t)) return 'HbA1c';
  if (/^(fasting (blood )?glucose|glucose fasting status)/.test(t)) return 'Blood glucose';
  if (/^type 2 diabetes(?: susceptibility)?$/.test(t)) return 'Type 2 diabetes';
  if (/^body mass(?: index)?(?: bmi,.*)?$/.test(t)) return 'Body mass / BMI';
  if (/^(ldl cholesterol( levels)?|low density lipoprotein cholesterol.*)$/.test(t)) return 'LDL cholesterol';
  if (/^hdl cholesterol( levels)?$/.test(t)) return 'HDL cholesterol';
  if (/^(cholesterol, total|total cholesterol levels)$/.test(t)) return 'Total cholesterol';
  return r.trait;
}

export function clusterTraits(results) {
  const groups = new Map();
  for (const r of results) {
    const name = traitFamily(r);
    if (!groups.has(name)) groups.set(name, {name, variants:[], endpoints: new Set()});
    groups.get(name).variants.push(r); groups.get(name).endpoints.add(r.trait);
  }
  return [...groups.values()].map(g => ({...g, endpoints:[...g.endpoints],
    called:g.variants.filter(r=>r.status==='Called').length,
    score:{status:'unavailable', percentile:null, reason:g.name==='Lactase persistence'
      ? 'This panel contains a lactase-persistence marker association, not a calibrated polygenic model. A population percentile is unavailable.'
      : 'No validated scoring model or compatible reference score distribution is installed for this trait. Grouped variants are not added together.'}
  })).sort((a,b)=>a.name.localeCompare(b.name));
}
