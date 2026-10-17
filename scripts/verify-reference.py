"""Verify a local FASTA against every CRAM dictionary entry, then index it.

Run in WSL with samtools. No read sequences or genotypes are exported.
"""
import argparse
import datetime
import hashlib
import json
import pathlib
import subprocess


def dictionary(text):
    result = {}
    for line in text.splitlines():
        if not line.startswith('@SQ\t'):
            continue
        tags = dict(field.split(':', 1) for field in line.split('\t')[1:])
        name = tags['SN']
        if name in result:
            raise ValueError('Duplicate reference name: ' + name)
        result[name] = (int(tags['LN']), tags.get('M5', '').lower())
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--alignment', required=True)
    p.add_argument('--reference', required=True)
    p.add_argument('--source-url', required=True)
    args = p.parse_args()
    fasta = pathlib.Path(args.reference)
    expected = dictionary(subprocess.check_output(['samtools', 'view', '-H', args.alignment], text=True))
    actual = dictionary(subprocess.check_output(['samtools', 'dict', str(fasta)], text=True))
    if not expected or not actual:
        raise ValueError('Empty sequence dictionary')
    missing = [n for n in expected if n not in actual]
    mismatched = [n for n in expected if n in actual and
                  (not expected[n][1] or expected[n] != actual[n])]
    result = {'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'reference': str(fasta), 'sourceURL': args.source_url,
              'requiredSequences': len(expected), 'referenceSequences': len(actual),
              'missing': missing, 'mismatched': mismatched,
              'allRequiredSequencesMatch': not missing and not mismatched}
    with fasta.open('rb') as handle:
        result['sha256'] = hashlib.file_digest(handle, 'sha256').hexdigest()
    if result['allRequiredSequencesMatch']:
        subprocess.run(['samtools', 'faidx', str(fasta)], check=True)
        result['index'] = str(fasta) + '.fai'
    pathlib.Path(str(fasta) + '.verification.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
    if not result['allRequiredSequencesMatch']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
