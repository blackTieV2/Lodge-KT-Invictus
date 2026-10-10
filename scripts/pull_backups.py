"""Pull encrypted backups from GitHub. No Cloudflare token or home-lab listener."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

REPO = 'blackTieV2/Lodge-KT-Invictus'
MAX_SIZE = 600 * 1024 * 1024

class PullError(RuntimeError):
    pass

def gh(*args):
    try:
        result = subprocess.run(['gh', *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                timeout=300, env={**os.environ,'GH_PROMPT_DISABLED':'1'}, check=False)
    except Exception:
        raise PullError('GitHub backup command could not complete.') from None
    if result.returncode:
        raise PullError('GitHub backup access failed. Check the read-only GitHub login and artifact retention.')
    return result.stdout

def gh_json(*args):
    try:
        return json.loads(gh(*args))
    except (ValueError, UnicodeError):
        raise PullError('Invalid GitHub response.') from None

def check_receipt(directory: Path, run_id: str, attempt: str, commit: str):
    if directory.is_symlink() or not directory.is_dir():
        raise PullError('Invalid backup directory.')
    children = list(directory.iterdir())
    if {p.name for p in children} != {'receipt.json','backup.tar.age'} or any(p.is_symlink() or not p.is_file() for p in children):
        raise PullError('Unexpected artifact contents; backup not accepted.')
    if (directory/'receipt.json').stat().st_size > 8192:
        raise PullError('Oversized backup receipt.')
    try:
        receipt = json.loads((directory/'receipt.json').read_text(encoding='utf-8'))
        valid = (receipt['format'] == 'invictus-backup-receipt-v1' and receipt['repository'] == REPO
                 and receipt['file'] == 'backup.tar.age' and receipt['run_id'] == str(run_id)
                 and receipt['run_attempt'] == str(attempt) and receipt['source_commit'] == commit
                 and re.fullmatch('[a-f0-9]{64}', receipt['sha256'])
                 and type(receipt['bytes']) is int and 100 <= receipt['bytes'] <= MAX_SIZE)
        created = datetime.fromisoformat(receipt['created_at'])
        if not valid or created.tzinfo is None or created > datetime.now(timezone.utc):
            raise ValueError()
    except (KeyError, ValueError, TypeError):
        raise PullError('Invalid backup receipt.') from None
    file = directory/'backup.tar.age'
    if file.stat().st_size != receipt['bytes']:
        raise PullError('Backup size does not match receipt.')
    with file.open('rb') as stream:
        if stream.read(22) != b'age-encryption.org/v1\n':
            raise PullError('Backup is not an age encrypted file.')
        stream.seek(0)
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    if digest != receipt['sha256']:
        raise PullError('Backup checksum failed; copy not accepted.')
    return receipt

def atomic_json(path: Path, content: dict):
    temp = path.with_name(path.name+'.tmp')
    with temp.open('x', encoding='utf-8') as stream:
        json.dump(content, stream)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temp, path)

def pull(destination: Path):
    destination = destination.expanduser().resolve()
    code_root = Path(__file__).resolve().parents[1]
    if destination == code_root or code_root in destination.parents:
        raise PullError('Backup destination must be outside the application checkout.')
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    lock = destination/'.pull.lock'
    try:
        fd = os.open(lock, os.O_CREAT|os.O_EXCL|os.O_WRONLY, 0o600)
    except FileExistsError:
        raise PullError('Another pull may be running. Inspect .pull.lock before manually removing a stale lock.') from None
    os.close(fd)
    try:
        repo = gh_json('api', 'repos/'+REPO)
        if repo.get('private') is not True or repo.get('full_name') != REPO:
            raise PullError('Expected the verified private Invictus repository.')
        runs = gh_json('run','list','--repo',REPO,'--workflow','backup-cloudflare.yml',
                       '--branch','main','--status','success','--limit','100',
                       '--json','databaseId,headSha')
        if not isinstance(runs, list) or not runs:
            raise PullError('No successful cloud backups are available. Nothing was marked current.')
        receipts = []
        for run in runs:
            run_id, commit = str(run.get('databaseId','')), run.get('headSha','')
            if not re.fullmatch(r'\d+', run_id) or not re.fullmatch('[a-f0-9]{40}', commit):
                raise PullError('Invalid backup run identity.')
            detail = gh_json('api',f'repos/{REPO}/actions/runs/{run_id}')
            attempt = str(detail.get('run_attempt',''))
            if detail.get('path') != '.github/workflows/backup-cloudflare.yml' or detail.get('head_branch') != 'main' or detail.get('head_sha') != commit or not re.fullmatch(r'\d+',attempt):
                raise PullError('Unexpected backup workflow identity.')
            final = destination/f'run-{run_id}-attempt-{attempt}'
            if final.exists():
                receipts.append(check_receipt(final,run_id,attempt,commit))
                continue
            artifacts = gh_json('api',f'repos/{REPO}/actions/runs/{run_id}/artifacts?per_page=100')
            name = f'invictus-backup-{run_id}-{attempt}'
            matches = [a for a in artifacts.get('artifacts',[]) if a.get('name') == name and not a.get('expired')]
            if not matches:
                continue
            if len(matches) != 1 or matches[0].get('size_in_bytes',MAX_SIZE+1) > MAX_SIZE:
                raise PullError('Invalid or oversized backup artifact.')
            with tempfile.TemporaryDirectory(prefix='.incoming-',dir=destination) as temp:
                staging = Path(temp)/'payload'
                gh('run','download',run_id,'--repo',REPO,'--name',name,'--dir',str(staging))
                receipt = check_receipt(staging,run_id,attempt,commit)
                if final.exists():
                    raise PullError('Backup destination unexpectedly appeared; previous copy retained.')
                os.rename(staging,final)
                receipts.append(receipt)
        if not receipts:
            raise PullError('No complete backup artifacts were retrieved. No success receipt written.')
        latest = max(receipts,key=lambda r:datetime.fromisoformat(r['created_at']))
        now = datetime.now(timezone.utc)
        age_hours = (now-datetime.fromisoformat(latest['created_at'])).total_seconds()/3600
        stale = age_hours > 36
        atomic_json(destination/'last-receipt.json',{'format':'invictus-local-receipt-v1',
                    'checked_at':now.isoformat(),'latest_cloud_created_at':latest['created_at'],
                    'source_commit':latest['source_commit'],'run_id':latest['run_id'],
                    'status':'stale' if stale else 'current','restore_verified':False})
        print('Encrypted backup copies verified locally. No files deleted and no changes uploaded.')
        if stale:
            raise PullError('Latest verified cloud backup is over 36 hours old. Check the cloud export job.')
    finally:
        lock.unlink(missing_ok=True)

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination',type=Path,required=True)
    args=parser.parse_args()
    try:
        pull(args.destination)
    except PullError as exc:
        print(str(exc),file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Local backup pull failed; private exception details suppressed.',file=sys.stderr)
        sys.exit(1)
