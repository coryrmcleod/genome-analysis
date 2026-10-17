// Primary Table2 GRS3 transcription, visually checked against frozen PDF page4.
// Evidence-only disagreement audit; never deletes terms or constructs a new score.
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex'),cache=new URL('../work/pgs-source/',import.meta.url);
const pdf=await readFile(new URL('PGS000756-methods.pdf',cache)),original=await readFile(new URL('PGS000756.txt.gz',cache));
if(hash(pdf)!=='b3a53399597aa115f941e61c5685c54bdd21f078a623d685fb6bb4f8ce97b109'||hash(original)!=='499ffd964d08164cb7f7d325f100229daae2738c59df942a53dea110035c2564')throw Error('Unreviewed sources');
const ids=gunzipSync(original).toString().split(/\r?\n/).filter(l=>/^rs\d+\t/.test(l)).map(l=>l.split('\t')[0]);
const table='rs4090391 rs12026171 rs3181077 rs3923809 rs2854536 rs6993992 rs10995245 rs16911668 rs12322530 rs1154155 rs12148472 rs7253062 rs8119787 rs2834113 rs2834188 rs5770911 rs213026 rs9444828 rs473267 rs2859090 rs7122887 rs524513 rs169160 rs9274477 rs3117221 rs2517455 rs3129932'.split(' ');
if(new Set(table).size!==27||new Set(ids).size!==32)throw Error('Unexpected evidence inventory');
const audit={id:'PGS000756',status:'excluded; primary GRS3 Table2 and Catalog inventory disagree',originalSha256:hash(original),primaryPDFSha256:hash(pdf),primaryTable:'Table2 GRS3, PDF page4; visually verified',catalogCount:ids.length,paperCount:table.length,paperIds:table,catalogOnly:ids.filter(x=>!table.includes(x)),paperOnly:table.filter(x=>!ids.includes(x)),caution:'No term dropped. This may be a paper or Catalog error; no authority to choose a corrected model. Table1 describes32candidates, but Table2 GRS3 lists27.'};
await writeFile(new URL('../work/narcolepsy-table-audit-2026-09-18.json',import.meta.url),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
