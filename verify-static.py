#!/usr/bin/env python3
"""Verify delivered assets over real HTTP under a project subdirectory.
This validates transport/relative paths, not a browser or WebGL renderer.
"""
import functools,hashlib,json,re,tempfile,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.request import build_opener,ProxyHandler
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*a):pass

def main():
    results=[];client=build_opener(ProxyHandler({}))
    with tempfile.TemporaryDirectory() as tmp:
        (Path(tmp)/'Portal_Room').symlink_to(ROOT,target_is_directory=True)
        server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=tmp))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            for path in ['index.html','styles/game.css',*[p.relative_to(ROOT).as_posix() for p in sorted((ROOT/'src').glob('*.js'))]]:
                response=client.open(f'http://127.0.0.1:{server.server_port}/Portal_Room/{path}',timeout=5)
                data=response.read();expected=(ROOT/path).read_bytes();assert data==expected,f'Unexpected asset at {path}'
                mime=response.headers.get_content_type()
                if path.endswith('.js'):assert mime in ['text/javascript','application/javascript'],mime
                if path.endswith('.css'):assert mime=='text/css',mime
                results.append({'path':path,'status':response.status,'mime':mime,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
                print('PASS HTTP /Portal_Room/'+path)
        finally:server.shutdown()
    out=ROOT/'test-results'/'static';out.mkdir(parents=True,exist_ok=True)
    (out/'report.json').write_text(json.dumps({'status':'passed','transport':'real localhost HTTP in Python; not browser navigation','basePath':'/Portal_Room/','count':len(results),'assets':results},indent=2))
    print(f'{len(results)} assets verified under a project subdirectory.')
if __name__=='__main__':main()
