import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
def load(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/f'{name}.py')
    mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod
backup=load('cloud_backup');pull=load('pull_backups')
RECIPIENT='age1'+'q'*58  # shape only; fake executor tests do NOT claim crypto verification.
COMMIT='a'*40

def fake_age(args,**kwargs):
    Path(args[args.index('--output')+1]).write_bytes(b'age-encryption.org/v1\n'+b'x'*100)

class BackupTests(unittest.TestCase):
    def test_completed_export_url_and_bookmark(self):
        url='https://example.r2.cloudflarestorage.com/db?signature=secret'
        self.assertEqual(backup.export_poll(lambda p:{'success':True,'result':{'status':'complete','at_bookmark':'one','result':{'signed_url':url}}}),(url,'one'))
    def test_poll_uses_returned_bookmark(self):
        calls=[]
        def post(payload):
            calls.append(payload)
            return {'success':True,'result':{'at_bookmark':'one',**({'status':'complete','result':{'signed_url':'https://x.r2.cloudflarestorage.com/db'}} if len(calls)==2 else {})}}
        backup.export_poll(post,sleep=lambda _:None)
        self.assertEqual(calls,[{'output_format':'polling'},{'output_format':'polling','current_bookmark':'one'}])
    def test_invalid_or_changed_bookmark_rejected(self):
        for first in [{'success':False},{'success':True,'result':{}},{'success':True,'result':{'status':'error','error':'secret details'}}]:
            with self.assertRaises(backup.BackupError) as c:backup.export_poll(lambda p:first)
            self.assertNotIn('secret details',str(c.exception))
        values=iter(['one','two'])
        with self.assertRaises(backup.BackupError):backup.export_poll(lambda p:{'success':True,'result':{'at_bookmark':next(values)}},sleep=lambda _:None)
    def test_timeout_is_bounded(self):
        ticks=iter([0,0,11])
        with self.assertRaises(backup.BackupError):backup.export_poll(lambda p:{'success':True,'result':{'at_bookmark':'one'}},clock=lambda:next(ticks),sleep=lambda _:None,seconds=10)
    def test_download_location_allowlist(self):
        for url in ['http://example.r2.cloudflarestorage.com/a','https://evil.test/db','https://r2.cloudflarestorage.com.evil.test/db','https://user:pw@x.r2.cloudflarestorage.com/db','https://x.r2.cloudflarestorage.com:8443/db']:
            with self.assertRaises(backup.BackupError):backup.export_poll(lambda p:{'success':True,'result':{'status':'complete','result':{'signed_url':url}}})
    def make_package(self,directory,executor=fake_age):
        sql,bundle=directory/'db.sql',directory/'source.bundle'
        sql.write_text('CREATE TABLE example(id INTEGER);');bundle.write_bytes(b'synthetic bundle placeholder')
        return backup.package_backup(sql,bundle,directory/'output',RECIPIENT,
               {'created_at':datetime.now(timezone.utc).isoformat(),'source_commit':COMMIT,'run_id':'1','run_attempt':'1'},executor=executor)
    def test_package_exposes_only_ciphertext_and_receipt(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=Path(tmp);self.make_package(d)
            self.assertEqual({p.name for p in (d/'output').iterdir()},{'receipt.json','backup.tar.age'})
            self.assertNotIn('CREATE TABLE',(d/'output'/'receipt.json').read_text())
            self.assertEqual(pull.check_receipt(d/'output','1','1',COMMIT)['run_id'],'1')
    def test_encryption_failure_leaves_no_finished_artifact(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=Path(tmp)
            def failed(*args,**kwargs):raise backup.BackupError('encryption test failure')
            with self.assertRaises(backup.BackupError):self.make_package(d,failed)
            self.assertFalse((d/'output').exists())
    def test_plaintext_disguised_as_ciphertext_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            def plain(args,**kwargs):Path(args[args.index('--output')+1]).write_bytes(b'SQL'*100)
            with self.assertRaises(backup.BackupError):self.make_package(Path(tmp),plain)
    def test_reusing_output_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=Path(tmp);self.make_package(d)
            with self.assertRaises(FileExistsError):self.make_package(d)
            self.assertTrue((d/'output'/'backup.tar.age').exists())
    def test_wrong_identity_or_hash_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=Path(tmp);self.make_package(d)
            for args in [('2','1',COMMIT),('1','2',COMMIT),('1','1','b'*40)]:
                with self.assertRaises(pull.PullError):pull.check_receipt(d/'output',*args)
            (d/'output'/'backup.tar.age').write_bytes(b'age-encryption.org/v1\n'+b'y'*100)
            with self.assertRaises(pull.PullError):pull.check_receipt(d/'output','1','1',COMMIT)
    def test_extra_file_and_traversal_in_receipt_refused(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=Path(tmp);self.make_package(d)
            path=d/'output'/'receipt.json';receipt=json.loads(path.read_text());receipt['file']='../private.json';path.write_text(json.dumps(receipt))
            with self.assertRaises(pull.PullError):pull.check_receipt(d/'output','1','1',COMMIT)
            receipt['file']='backup.tar.age';path.write_text(json.dumps(receipt));(d/'output'/'secret.txt').write_text('no')
            with self.assertRaises(pull.PullError):pull.check_receipt(d/'output','1','1',COMMIT)
    def test_local_receiver_uses_no_cloudflare_write_credentials(self):
        source=(ROOT/'scripts'/'pull_backups.py').read_text()
        self.assertNotIn('CLOUDFLARE_API_TOKEN',source)
        self.assertNotIn('git push',source)
        self.assertNotIn('rmtree',source)
    def test_atomic_receipt_replaces_only_status_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'status.json';pull.atomic_json(path,{'a':1});pull.atomic_json(path,{'a':2})
            self.assertEqual(json.loads(path.read_text()),{'a':2});self.assertFalse(path.with_name('status.json.tmp').exists())

if __name__=='__main__':unittest.main()
