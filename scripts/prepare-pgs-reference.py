"""Run under WSL. Extract the public panel safely; subset exact scoring positions.
No personal genomes are read. Original reference archive and files are preserved.
"""
import hashlib, json, pathlib, subprocess, tarfile, shutil, sys

root = pathlib.Path(sys.argv[1]).resolve()
archive = root / 'pgsc_1000G_v1.tar.zst'
expected = 7434464202
if archive.stat().st_size != expected:
    raise ValueError('Reference archive has unexpected length')
digest = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
out = root / 'extracted'
out.mkdir(exist_ok=True)
proc = subprocess.Popen(['zstd', '-dc', str(archive)], stdout=subprocess.PIPE)
members = []
with tarfile.open(fileobj=proc.stdout, mode='r|') as tar:
    for member in tar:
        destination = (out / member.name).resolve()
        if not destination.is_relative_to(out) or not member.isfile():
            raise ValueError('Unsafe archive member: ' + member.name)
        members.append({'name': member.name, 'bytes': member.size})
        if member.name.startswith('GRCh37_1000G'):
            if destination.exists():
                if destination.stat().st_size != member.size:
                    raise ValueError('Incomplete existing extraction: ' + member.name)
            else:
                with destination.open('xb') as target:
                    shutil.copyfileobj(tar.extractfile(member), target, 4*1024*1024)
            print('Extracted', member.name, flush=True)
if proc.wait() != 0:
    raise ValueError('Compressed archive failed integrity check')
(root / 'archive-provenance.json').write_text(json.dumps({
    'url': 'https://ftp.ebi.ac.uk/pub/databases/spot/pgs/resources/pgsc_1000G_v1.tar.zst',
    'sha256': digest, 'bytes': expected, 'zstdIntegrityVerified': True,
    'members': members, 'referenceBuild': 'GRCh37',
}, indent=2))
print('Archive integrity and safe extraction verified', digest, flush=True)
