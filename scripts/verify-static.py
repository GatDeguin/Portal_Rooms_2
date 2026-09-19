#!/usr/bin/env python3
"""Serve and fetch the actual active module graph, without an import-map adapter."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.request import urlopen
from urllib.parse import urljoin
import re,json
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/';pending=['index.html'];seen=set()
try:
    while pending:
        path=pending.pop()
        if path in seen:continue
        with urlopen(urljoin(base,path),timeout=10) as response:
            assert response.status==200,path
            body=response.read();mime=response.headers.get_content_type()
        assert body==(ROOT/path).read_bytes(),f'Unexpected response for {path}'
        if path.endswith('.js'):assert mime in ('text/javascript','application/javascript'),(path,mime)
        if path.endswith('.css'):assert mime=='text/css',(path,mime)
        text=body.decode();seen.add(path)
        refs=re.findall(r"from\s+['\"](\./[^'\"]+)['\"]",text) if path.endswith('.js') else re.findall(r'(?:src|href)="(\./[^"?#]+)"',text) if path.endswith('.html') else []
        if path.endswith('.js'):
            refs+=re.findall(r"new\s+URL\(\s*['\"](\./[^'\"]+)['\"]\s*,\s*import\.meta\.url\s*\)",text)
        for ref in refs:
            child=(Path(path).parent/ref).as_posix();assert (ROOT/child).is_file(),child;pending.append(child)
    assert 'src/campaign.js' in seen and 'src/levels-expansion.js' in seen
    assert 'src/renderer-worker.js' in seen, 'Worker entrypoint was not checked over HTTP'
    report={'status':'passed','transport':'actual HTTP server, original relative ES module URLs','files':sorted(seen)}
    out=ROOT/'test-results'/'static';out.mkdir(parents=True,exist_ok=True);(out/'report.json').write_text(json.dumps(report,indent=2))
    print(f'PASS: {len(seen)} served files, module graph, MIME types and byte equality.')
finally:server.shutdown();server.server_close()
