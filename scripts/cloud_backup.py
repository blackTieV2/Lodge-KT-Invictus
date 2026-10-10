"""Cloud-side export/encryption. Never runs the app or contacts the home lab."""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
from datetime import datetime, timezone
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler

REPO = 'blackTieV2/Lodge-KT-Invictus'
MAX_EXPORT = 512 * 1024 * 1024

class BackupError(RuntimeError):
    """Deliberately non-sensitive failure message."""

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

OPENER = build_opener(NoRedirect)

def fetch_json(url: str, token: str, payload: dict | None = None) -> dict:
    request = Request(url, headers={'Authorization': f'Bearer {token}',
                      'Accept': 'application/json', 'Content-Type': 'application/json',
                      'User-Agent': 'Invictus-Backup'},
                      data=None if payload is None else json.dumps(payload).encode())
    try:
        with OPENER.open(request, timeout=30) as response:
            result = json.load(response)
    except Exception:
        raise BackupError('Authenticated export request failed; URL, credentials and response were not logged.') from None
    if not isinstance(result, dict):
        raise BackupError('Unexpected export response.')
    return result

def export_poll(post, sleep=time.sleep, clock=time.monotonic, seconds=600) -> tuple[str, str]:
    """Do not log the signed URL or API messages. Poll continuously while active."""
    deadline = clock() + seconds
    bookmark = None
    while clock() < deadline:
        payload = {'output_format': 'polling'}
        if bookmark:
            payload['current_bookmark'] = bookmark
        response = post(payload)
        result = response.get('result') if response.get('success') is True else None
        if not isinstance(result, dict) or result.get('status') == 'error' or result.get('success') is False:
            raise BackupError('D1 export failed. No completed backup was produced.')
        new_bookmark = result.get('at_bookmark')
        if new_bookmark:
            if not isinstance(new_bookmark, str) or len(new_bookmark) > 1024:
                raise BackupError('Invalid export bookmark.')
            if bookmark and new_bookmark != bookmark:
                raise BackupError('Export bookmark changed unexpectedly.')
            bookmark = new_bookmark
        if result.get('status') == 'complete':
            url = result.get('result', {}).get('signed_url')
            parsed = urlparse(url if isinstance(url, str) else '')
            # API-issued R2 URL only. Never send the Cloudflare API token here.
            if parsed.scheme != 'https' or not parsed.hostname or not parsed.hostname.endswith('.r2.cloudflarestorage.com') or parsed.username or parsed.password or parsed.port not in (None, 443):
                raise BackupError('Unexpected D1 download location; no credentials were forwarded.')
            return url, bookmark or ''
        if not bookmark:
            raise BackupError('D1 did not return a polling bookmark.')
        sleep(1)
    raise BackupError('D1 export polling timed out. No backup was marked complete.')

def download_sql(url: str, path: Path):
    # No Authorization header: the signed URL authorises this one download.
    try:
        with OPENER.open(Request(url, headers={'User-Agent': 'Invictus-Backup'}), timeout=60) as response, path.open('xb') as stream:
            size = 0
            while chunk := response.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_EXPORT:
                    raise BackupError('D1 export exceeds the configured backup limit.')
                stream.write(chunk)
        if size == 0:
            raise BackupError('D1 returned an empty export.')
    except BackupError:
        raise
    except Exception:
        raise BackupError('SQL download failed; signed URL not logged.') from None

def sha(path: Path) -> str:
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def run(args: list[str], *, cwd=None, input_bytes=None):
    try:
        response = subprocess.run(args, cwd=cwd, input=input_bytes, stdout=subprocess.PIPE,
                                  stderr=subprocess.PIPE, timeout=180, check=False)
    except Exception:
        raise BackupError(f'{args[0]} could not complete; private output suppressed.') from None
    if response.returncode:
        raise BackupError(f'{args[0]} failed; private output suppressed.')
    return response.stdout

def package_backup(sql: Path, bundle: Path, output: Path, recipient: str,
                   metadata: dict, executor=run) -> dict:
    if not re.fullmatch(r'age1[023456789acdefghjklmnpqrstuvwxyz]{58}', recipient):
        raise BackupError('Use a native age public recipient, never a private identity or passphrase.')
    output.mkdir(parents=True, exist_ok=False)
    try:
        with tempfile.TemporaryDirectory(prefix='invictus-pack-') as tmp:
            directory = Path(tmp)
            manifest = dict(metadata, format='invictus-recovery-v1',
                            files={'database.sql': sha(sql), 'source.bundle': sha(bundle)},
                            note='D1 data/audit/recovery plus fetched Git refs. GitHub secrets/issues and uncommitted source files are not included.')
            manifest_path = directory / 'manifest.json'
            manifest_path.write_text(json.dumps(manifest), encoding='utf-8')
            archive = directory / 'backup.tar.gz'
            with tarfile.open(archive, 'w:gz') as tar:
                for path, name in [(sql, 'database.sql'), (bundle, 'source.bundle'), (manifest_path, 'manifest.json')]:
                    tar.add(path, arcname=name, recursive=False)
            encrypted = output / 'backup.tar.age'
            executor(['age', '--encrypt', '--recipient', recipient, '--output', str(encrypted), str(archive)])
            if not encrypted.is_file() or encrypted.stat().st_size < 100:
                raise BackupError('Encryption did not produce a complete file.')
            with encrypted.open('rb') as stream:
                if stream.read(22) != b'age-encryption.org/v1\n':
                    raise BackupError('Unexpected encrypted backup format.')
            receipt = {'format':'invictus-backup-receipt-v1', 'repository':REPO,
                       'created_at':metadata['created_at'], 'source_commit':metadata['source_commit'],
                       'run_id':str(metadata['run_id']), 'run_attempt':str(metadata['run_attempt']),
                       'file':'backup.tar.age', 'bytes':encrypted.stat().st_size,
                       'sha256':sha(encrypted)}
            (output / 'receipt.json').write_text(json.dumps(receipt), encoding='utf-8')
            return receipt
    except Exception:
        shutil.rmtree(output, ignore_errors=True)
        raise

def main():
    os.umask(0o077)
    if os.getenv('GITHUB_REPOSITORY') != REPO or os.getenv('GITHUB_REF') != 'refs/heads/main':
        raise BackupError('Backup job must run on the intended repository main branch.')
    gh = os.environ.get('GITHUB_TOKEN', '')
    token = os.environ.get('CLOUDFLARE_BACKUP_TOKEN', '')
    account = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
    recipient = os.environ.get('BACKUP_AGE_RECIPIENT', '').strip()
    if not gh or not token or not re.fullmatch('[a-f0-9]{32}', account):
        raise BackupError('The separate backup credentials/account must be configured.')
    if not shutil.which('age'):
        raise BackupError('age must be installed on the cloud backup runner.')
    # Validate encryption before starting an export that can temporarily block D1.
    run(['age','--encrypt','--recipient',recipient], input_bytes=b'Preflight only')
    repo = fetch_json('https://api.github.com/repos/' + REPO, gh)
    if repo.get('private') is not True or repo.get('full_name') != REPO:
        raise BackupError('Backups are disabled until repository privacy is verified live.')
    prefix = f'https://api.cloudflare.com/client/v4/accounts/{account}/d1/database'
    response = fetch_json(prefix + '?name=invictus-register&per_page=100', token)
    if response.get('success') is not True or not isinstance(response.get('result'), list):
        raise BackupError('Could not discover the target D1 database.')
    databases = [d for d in response['result'] if d.get('name') == 'invictus-register']
    if len(databases) != 1 or not re.fullmatch('[a-f0-9-]{36}', databases[0].get('uuid', '')):
        raise BackupError('Expected exactly one existing Invictus D1 database.')
    database = databases[0]['uuid']
    if run(['git','rev-parse','--is-shallow-repository']).strip() != b'false':
        raise BackupError('Fetch full Git history before creating a repository backup.')
    commit = run(['git','rev-parse','HEAD']).decode().strip()
    if commit != os.environ.get('GITHUB_SHA'):
        raise BackupError('Backup checkout does not match the workflow commit.')
    output = Path(os.environ.get('RUNNER_TEMP', tempfile.gettempdir())) / 'invictus-encrypted-backup'
    # A unique output must not reuse leftovers from another job.
    if output.exists():
        raise BackupError('Backup output already exists; refusing to reuse it.')
    with tempfile.TemporaryDirectory(prefix='invictus-export-') as tmp:
        directory = Path(tmp)
        url, bookmark = export_poll(lambda payload: fetch_json(prefix + f'/{database}/export', token, payload))
        sql, bundle = directory/'database.sql', directory/'source.bundle'
        download_sql(url, sql)
        run(['git','bundle','create',str(bundle),'--all'])
        run(['git','bundle','verify',str(bundle)])
        package_backup(sql, bundle, output, recipient,
                       {'created_at':datetime.now(timezone.utc).isoformat(), 'database_id':database,
                        'bookmark':bookmark, 'source_commit':commit,
                        'run_id':os.environ['GITHUB_RUN_ID'], 'run_attempt':os.environ['GITHUB_RUN_ATTEMPT']})
    print('Encrypted database/source backup prepared. Local receipt and restore are not yet verified.')

if __name__ == '__main__':
    try:
        main()
    except BackupError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Backup did not complete; sensitive exception details suppressed.', file=sys.stderr)
        sys.exit(1)
