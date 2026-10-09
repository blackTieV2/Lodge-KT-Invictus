"""Local browser checks. Uses fictional records only; no private data enters logs."""
from pathlib import Path
import json, os, tempfile, threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
in_memory=os.environ.get('INVICTUS_IN_MEMORY')=='1'
with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox']}
    if os.environ.get('CHROMIUM_PATH'): launch['executable_path']=os.environ['CHROMIUM_PATH']
    browser=p.chromium.launch(**launch)
    page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
    errors=[]; remote=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.on('request',lambda req:remote.append(req.url) if req.url.startswith(('http:','https:')) and not req.url.startswith(origin+'/') else None)
    page.on('dialog',lambda d:d.accept('QA operator') if d.type=='prompt' else d.accept())
    if in_memory: page.set_content((ROOT/'dist/Invictus.html').read_text())
    elif os.environ.get('INVICTUS_FILE')=='1': page.goto((ROOT/'dist/Invictus.html').as_uri())
    else: page.goto(origin+'/dist/Invictus.html')
    expect(page.get_by_text('A clear view of every')).to_be_visible()
    page.get_by_role('button',name='Try a fictional demonstration').click()
    expect(page.get_by_role('heading',name='The register',exact=True)).to_be_visible()
    expect(page.locator('tbody tr')).to_have_count(6)
    page.get_by_role('searchbox').fill('Ben')
    expect(page.locator('tbody tr')).to_have_count(1)
    page.get_by_role('button',name='Benedict Sample',exact=True).click()
    expect(page.get_by_role('heading',name='Benedict Sample',exact=True)).to_be_visible()
    expect(page.locator('#member-dialog').get_by_text('Paid · posting pending',exact=True)).to_be_visible()
    page.get_by_role('button',name='Edit record',exact=True).click()
    page.get_by_label('Working notes',exact=True).fill('Updated locally during browser test')
    page.get_by_label('Change reason / source reference').fill('Browser QA reference')
    page.get_by_role('button',name='Save working record',exact=True).click()
    expect(page.get_by_text('Updated locally during browser test',exact=True)).to_be_visible()
    expect(page.locator('#save-state')).to_have_text('Changes not exported')
    page.get_by_role('button',name='Follow-ups',exact=True).click()
    task=page.locator('.task-form').first
    task.get_by_label('Progress').select_option('done')
    task.get_by_role('button',name='Save action').click()
    expect(page.locator('#action-error')).to_contain_text('completion reference')
    task.get_by_label('Reference / completion evidence').fill('External reference QA-001')
    task.get_by_role('button',name='Save action').click()
    expect(page.locator('.task-form').first.get_by_label('Progress')).to_have_value('done')
    page.get_by_role('button',name='Close member record').click()
    if not in_memory:
        page.get_by_role('button',name='Save private copy',exact=True).click()
        page.get_by_label('Passphrase',exact=True).fill('browser test passphrase 123')
        page.get_by_label('Confirm passphrase',exact=True).fill('browser test passphrase 123')
        page.get_by_label('Also remember this encrypted copy').check()
        with page.expect_download() as download_info:
            page.get_by_role('button',name='Save encrypted file',exact=True).click()
        exported=Path(tempfile.gettempdir())/'invictus-browser-test.invictus'
        download_info.value.save_as(exported)
        vault=json.loads(exported.read_text())
        assert vault['format']=='invictus-vault' and 'Benedict' not in exported.read_text()
        expect(page.locator('#save-state')).to_have_text('Exported revision 2')
        stored=page.evaluate('localStorage.getItem("invictus.register.vault.v1")')
        assert stored and 'Benedict' not in stored
        page.get_by_role('button',name='Close register',exact=True).click()
        expect(page.get_by_role('button',name='Unlock saved copy')).to_be_visible()
        page.get_by_role('button',name='Unlock saved copy').click()
        expect(page.get_by_label('Confirm passphrase',exact=True)).not_to_be_visible()
        page.get_by_label('Passphrase',exact=True).fill('wrong password')
        page.get_by_role('button',name='Unlock register',exact=True).click()
        expect(page.locator('#file-error')).to_contain_text('incorrect')
        page.get_by_label('Passphrase',exact=True).fill('browser test passphrase 123')
        page.get_by_role('button',name='Unlock register',exact=True).click()
        expect(page.locator('tbody tr')).to_have_count(6)
    else:
        page.get_by_role('button',name='Save private copy',exact=True).click()
        page.get_by_label('Passphrase',exact=True).fill('browser test passphrase 123')
        page.get_by_label('Confirm passphrase',exact=True).fill('browser test passphrase 123')
        page.get_by_role('button',name='Save encrypted file',exact=True).click()
        expect(page.locator('#file-error')).to_contain_text('unavailable')
        page.get_by_role('button',name='Close file dialog').click()
    page.get_by_role('button',name='Treasurer actions',exact=False).first.click()
    expect(page.get_by_role('heading',name='Treasurer actions',exact=True)).to_be_visible()
    page.get_by_role('searchbox').fill('Frederick')
    expect(page.locator('tbody tr')).to_have_count(1)
    page.get_by_role('button',name='The register',exact=True).click()
    page.get_by_role('button',name='Missing KOL',exact=True).click()
    expect(page.locator('tbody tr')).to_have_count(1)
    page.get_by_role('button',name='Everyone',exact=True).click()
    page.get_by_role('button',name='GP cost review',exact=False).click()
    expect(page.locator('.review-total')).to_contain_text('9.20')
    page.get_by_role('button',name='The register',exact=True).click()
    page.evaluate('document.querySelector("#toast").classList.remove("show")')
    page.screenshot(path=str(ROOT/'qa-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    expect(page.get_by_role('searchbox')).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Page overflows on mobile'
    page.screenshot(path=str(ROOT/'qa-mobile.png'),full_page=True)
    # Malformed imports must not replace the open register.
    invalid=Path(tempfile.gettempdir())/'invictus-invalid.json'
    invalid.write_text('{"format":"other"}')
    page.locator('#file-input').set_input_files(str(invalid))
    expect(page.locator('#toast')).to_contain_text('Could not open file')
    expect(page.locator('tbody tr')).to_have_count(6)
    # Imported markup is displayed as text; it never runs as HTML.
    malicious=page.evaluate('Invictus.demo()')
    malicious['members'][0]['name']='<img src=x onerror="window.bad=1">'
    xss=Path(tempfile.gettempdir())/'invictus-xss.json';xss.write_text(json.dumps(malicious))
    page.locator('#file-input').set_input_files(str(xss))
    expect(page.locator('tbody tr')).to_have_count(6)
    assert page.evaluate('window.bad === undefined')
    assert not page.locator('tbody img').count()
    assert errors==[],errors
    assert remote==[],remote
    browser.close()
    server.shutdown()
    print('PASS: UI editing, task validation, filtering, mobile layout, import validation and XSS checks; no JS errors or remote requests.')
    print('Browser encryption / cache round-trip: '+('NOT RUN (in-memory insecure context); crypto core tested separately in Node.' if in_memory else 'PASSED on '+('file URL.' if os.environ.get('INVICTUS_FILE')=='1' else 'localhost.')))
