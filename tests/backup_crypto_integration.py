"""Real age encryption, decryption, checksum, SQLite and Git restore; synthetic only."""
import importlib.util
import json
from pathlib import Path
import sqlite3
import subprocess
import tarfile
import tempfile
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('cloud_backup',ROOT/'scripts'/'cloud_backup.py')
backup=importlib.util.module_from_spec(spec);spec.loader.exec_module(backup)
with tempfile.TemporaryDirectory() as tmp:
    d=Path(tmp);key=d/'key.txt'
    backup.run(['age-keygen','--output',str(key)])
    recipient=backup.run(['age-keygen','-y',str(key)]).decode().strip()
    source=d/'source';source.mkdir()
    backup.run(['git','init','-b','main',str(source)])
    backup.run(['git','config','user.name','Synthetic Tester'],cwd=source)
    backup.run(['git','config','user.email','synthetic@example.invalid'],cwd=source)
    (source/'README.md').write_text('Synthetic recovery test only.\n')
    backup.run(['git','add','README.md'],cwd=source)
    backup.run(['git','commit','-m','Synthetic source'],cwd=source)
    commit=backup.run(['git','rev-parse','HEAD'],cwd=source).decode().strip()
    bundle=d/'source.bundle';backup.run(['git','bundle','create',str(bundle),'--all'],cwd=source)
    db=sqlite3.connect(':memory:')
    migration=ROOT/'migrations'/'0001_online.sql'
    db.executescript(migration.read_text())
    db.execute('INSERT INTO register_state VALUES (1,1,?,?,?,?,?)',('{"members":[],"revision":1}',datetime.now(timezone.utc).isoformat(),'synthetic','synthetic','synthetic'))
    sql=d/'database.sql';sql.write_text('\n'.join(db.iterdump()),encoding='utf-8');db.close()
    out=d/'encrypted'
    backup.package_backup(sql,bundle,out,recipient,{'created_at':datetime.now(timezone.utc).isoformat(),'source_commit':commit,'run_id':'1','run_attempt':'1'})
    restored=d/'restored.tar.gz'
    backup.run(['age','--decrypt','--identity',str(key),'--output',str(restored),str(out/'backup.tar.age')])
    with tarfile.open(restored,'r:gz') as tar:
        assert set(tar.getnames())=={'database.sql','source.bundle','manifest.json'}
        manifest=json.load(tar.extractfile('manifest.json'))
        restored_sql=tar.extractfile('database.sql').read()
        import hashlib
        assert hashlib.sha256(restored_sql).hexdigest()==manifest['files']['database.sql']
        recovered_bundle=d/'recovered.bundle';recovered_bundle.write_bytes(tar.extractfile('source.bundle').read())
        assert backup.sha(recovered_bundle)==manifest['files']['source.bundle']
    check=sqlite3.connect(':memory:');check.executescript(restored_sql.decode())
    assert check.execute('PRAGMA quick_check').fetchone()==('ok',)
    assert check.execute('SELECT version FROM register_state').fetchone()==(1,)
    assert check.execute('SELECT COUNT(*) FROM register_audit').fetchone()==(1,)
    assert check.execute('SELECT COUNT(*) FROM register_backups').fetchone()==(1,)
    check.close()
    recovered_repo=d/'recovered-repo';backup.run(['git','clone',str(recovered_bundle),str(recovered_repo)])
    assert backup.run(['git','rev-parse','HEAD'],cwd=recovered_repo).decode().strip()==commit
    other_key=d/'wrong-key.txt';backup.run(['age-keygen','--output',str(other_key)])
    failed=subprocess.run(['age','-d','-i',str(other_key),str(out/'backup.tar.age')],capture_output=True)
    assert failed.returncode!=0
    corrupted=bytearray((out/'backup.tar.age').read_bytes());corrupted[-1]^=1
    tampered=d/'tampered.age';tampered.write_bytes(corrupted)
    failed=subprocess.run(['age','-d','-i',str(key),str(tampered)],capture_output=True)
    assert failed.returncode!=0
print('PASS: real age round-trip, wrong-key/tamper rejection, SQLite integrity/audit recovery and source Git bundle recovery (synthetic).')
