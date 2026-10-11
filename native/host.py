#!/usr/bin/env python3
"""Study Keys local file store. Only the library root is addressable; no network or arbitrary command API."""
import base64, contextlib, fcntl, hashlib, json, os, re, struct, sys, tempfile, time, subprocess
import threading
from pathlib import Path
from urllib.parse import urlsplit, unquote

MAX_INPUT = 60 * 1024 * 1024

def packed(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode('utf-8')

def digest(value):
    return hashlib.sha256(packed(value)).hexdigest() if value is not None else None

# Fixed, opt-in UI action. Never accepts a script, command, application or label
# from the extension. Skip page content and operate only on Chrome browser UI.
VERTICAL_TABS_SCRIPT = r'''using terms from application "System Events"
on findToggle(node, depth)
    if depth > 12 then return missing value
    try
        set nodeRole to role of node
        if nodeRole is "AXWebArea" then return missing value
        if nodeRole is "AXButton" then
            set labels to {name of node, description of node}
            if labels contains "Expand Tabs" or labels contains "Collapse Tabs" then return node
        end if
        repeat with child in UI elements of node
            set found to my findToggle(child, depth + 1)
            if found is not missing value then return found
        end repeat
    end try
    return missing value
end findToggle
tell application "System Events"
    set foreground to first application process whose frontmost is true
    if bundle identifier of foreground is not "com.google.Chrome" then error "Focus Google Chrome before toggling vertical tabs."
    set found to my findToggle(front window of foreground, 0)
    if found is missing value then error "Enable Chrome vertical tabs first. The Expand Tabs / Collapse Tabs button is not available."
    click found
end tell
end using terms from'''

def toggle_vertical_tabs(root):
    if sys.platform != 'darwin': raise ValueError('Native vertical-tabs toggling currently supports Google Chrome on macOS.')
    if not (root / '.integration' / 'vertical-tabs-enabled').is_file():
        raise ValueError('Enable the optional vertical-tabs helper in setup before using Space s. This needs macOS Accessibility access.')
    try:
        result = subprocess.run(['/usr/bin/osascript', '-e', VERTICAL_TABS_SCRIPT], capture_output=True, text=True, timeout=5, check=False)
    except subprocess.TimeoutExpired:
        raise ValueError('Chrome did not respond to the vertical-tabs toggle.')
    if result.returncode: raise ValueError(result.stderr.strip()[:500] or 'Allow Google Chrome in macOS Accessibility settings to toggle vertical tabs.')
    return {'toggled': True}

class Library:
    def __init__(self, root):
        raw = Path(root).expanduser().absolute()
        if raw.is_symlink(): raise ValueError('The library root cannot be a symbolic link.')
        raw.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.root = raw.resolve()
        self.path('.integration').mkdir(exist_ok=True, mode=0o700)
        self.path('.pending').mkdir(exist_ok=True, mode=0o700)

    def path(self, *parts):
        p = self.root.joinpath(*parts)
        if not p.is_relative_to(self.root): raise ValueError('Invalid library path.')
        current = self.root
        for part in p.relative_to(self.root).parts:
            if part in ('.', '..'): raise ValueError('Invalid library path.')
            current /= part
            if current.is_symlink(): raise ValueError('Symbolic links are not followed inside the library.')
        if not p.resolve().is_relative_to(self.root): raise ValueError('Path escaped the library.')
        return p

    def read(self, p, default=None):
        p = self.path(p.relative_to(self.root))
        return json.loads(p.read_text()) if p.exists() else default

    def write(self, p, value, raw=False):
        p = self.path(p.relative_to(self.root)); p.parent.mkdir(parents=True, exist_ok=True)
        data = value if raw else packed(value)
        if p.exists() and p.read_bytes() == data: return
        fd, name = tempfile.mkstemp(prefix='write-', dir=self.path('.pending'))
        try:
            with os.fdopen(fd, 'wb') as f: f.write(data); f.flush(); os.fsync(f.fileno())
            os.replace(name, p)
        finally:
            if os.path.exists(name): os.unlink(name)

    def folder(self, url):
        u = urlsplit(url)
        if u.scheme == 'file':
            # The source URL is only an identity; never read or write the source file.
            path = unquote(u.path, errors='strict')
            if u.netloc or not u.path.startswith('/') or u.query or u.fragment or re.search(r'%(?:2f|5c|00)', u.path, re.I) or re.search(r'[\\\x00-\x1f]', path) or not re.search(r'\.(md|markdown|mdown|mkd|mkdn|html|htm)$', path, re.I):
                raise ValueError('Invalid local document URL.')
            domain = 'local-files'
            name = re.sub(r'[^a-zA-Z0-9_-]', '-', path.rsplit('/', 1)[-1])
        else:
            if u.scheme not in ('http', 'https') or not u.hostname or u.username or u.password: raise ValueError('Invalid page URL.')
            domain = re.sub(r'[^a-zA-Z0-9._-]', '-', u.netloc.lower())[:100]
            name = re.sub(r'[^a-zA-Z0-9_-]', '-', u.path.strip('/') + ('-' + u.fragment if u.fragment else ''))
        name = re.sub('-+', '-', name).strip('-')[:75] or 'index'
        return self.path('pages', domain, name + '--' + hashlib.sha256(url.encode()).hexdigest()[:12])

    def key(self, key):
        if key in ('settings', 'notebook-layout', 'global-marks', 'navigation'): return key, None
        if not isinstance(key, str) or ':' not in key: raise ValueError('Unknown storage key.')
        kind, value = key.split(':', 1)
        if kind in ('page', 'drawing', 'marks'): self.folder(value)
        elif kind in ('recovery','agent-run'):
            if not re.fullmatch(r'[\w-]{1,80}', value, flags=re.ASCII): raise ValueError('Invalid recovery identifier.')
        else: raise ValueError('Unknown storage key.')
        return kind, value

    def validate(self, values):
        if not isinstance(values, dict) or len(values) > 30000: raise ValueError('Invalid library update.')
        for key, value in values.items():
            kind, ident = self.key(key)
            if not isinstance(value, dict): raise ValueError('Invalid record.')
            if kind == 'agent-run':
                self.folder(value.get('url',''))
                if value.get('id') != ident or value.get('status') not in ('applied','undone') or not isinstance(value.get('requestHash'),str) or not isinstance(value.get('annotationChanges'),list) or not isinstance(value.get('drawingChanges'),list) or len(packed(value))>30*1024*1024: raise ValueError('Invalid study run.')
            if kind in ('page', 'drawing', 'recovery', 'marks'):
                if not isinstance(value.get('title'), str) or len(value['title']) > 500: raise ValueError('Invalid page title.')
                self.folder(value.get('url', ''))
                if kind != 'recovery' and value['url'] != ident: raise ValueError('URL does not match storage key.')
                if kind == 'page':
                    if not isinstance(value.get('items'), list): raise ValueError('Invalid annotations.')
                    for item in value['items']:
                        if not isinstance(item,dict) or not re.fullmatch(r'[\w-]{1,80}',item.get('id',''),flags=re.ASCII) or item.get('color') not in ('yellow','blue','green','orange','purple','red','pink') or not isinstance(item.get('note'),str) or len(item['note'])>100000: raise ValueError('Invalid annotation.')
                        if item.get('anchor') is not None and (not isinstance(item['anchor'],dict) or not isinstance(item['anchor'].get('quote'),str)): raise ValueError('Invalid annotation anchor.')
                elif kind == 'marks':
                    if not isinstance(value.get('marks'),dict): raise ValueError('Invalid marks.')
                else:
                    scene = value.get('scene', {})
                    if scene.get('type') != 'excalidraw' or not isinstance(scene.get('elements'), list) or len(packed(scene)) > 25 * 1024 * 1024: raise ValueError('Invalid or oversized drawing.')
                    if not isinstance(value.get('revision'), str) or not isinstance(value.get('updatedAt'), int): raise ValueError('Invalid drawing revision.')
                    if kind == 'recovery' and value.get('id') != ident: raise ValueError('Invalid recovery ID.')

    def page_records(self, folder):
        meta = self.read(folder / 'page.json')
        if not meta: return {}
        url, title = meta['url'], meta['title']
        if self.folder(url) != folder: raise ValueError('Page folder does not match its URL.')
        result = {}
        annotations = self.read(folder / 'annotations.json')
        if annotations is not None: result['page:' + url] = dict(url=url, title=title, items=annotations['items'])
        marks = self.read(folder / 'marks.json')
        if marks is not None: result['marks:' + url] = dict(url=url,title=title,marks=marks)
        dm = self.read(folder / 'drawing.json')
        if dm:
            scene = self.read(folder / 'drawing.excalidraw')
            if scene is None: raise ValueError('A drawing file is missing. Restore it from Git before continuing.')
            actual = digest(scene)
            revision = dm['revision'] if actual == dm.get('contentHash') else 'file-' + actual
            stamp = dm['updatedAt'] if actual == dm.get('contentHash') else max(dm['updatedAt'], int((folder / 'drawing.excalidraw').stat().st_mtime * 1000))
            result['drawing:' + url] = dict(url=url, title=title, scene=scene, revision=revision, updatedAt=stamp)
        recover = folder / 'recovery'
        if recover.exists():
            self.path(recover.relative_to(self.root))
            for p in recover.glob('*.json'):
                r = self.read(p); scene = self.read(p.with_suffix('.excalidraw'))
                if scene is None: raise ValueError('A recovery drawing file is missing.')
                result['recovery:' + r['id']] = {**r, 'url':url, 'title':title, 'scene':scene}
        runs=folder/'agent-runs'
        if runs.exists():
            self.path(runs.relative_to(self.root))
            for p in runs.glob('*.json'):
                r=self.read(p)
                if r.get('url')!=url or r.get('id')!=p.stem: raise ValueError('Study run identity mismatch.')
                result['agent-run:'+r['id']]=r
        return result

    def get(self, key=None):
        if key is None:
            result = {}
            pages = self.path('pages')
            if pages.exists():
                for p in pages.glob('*/*/page.json'): result.update(self.page_records(p.parent))
            for k, filename in [('settings','settings.json'), ('notebook-layout','window.json'), ('global-marks','global-marks.json'), ('navigation','navigation/study.json')]:
                value = self.read(self.path(filename))
                if value is not None: result[k] = value
            return result
        kind, ident = self.key(key)
        if kind in ('page', 'drawing', 'marks'): return {key:self.page_records(self.folder(ident)).get(key)}
        if kind in ('recovery','agent-run'): return {key:self.get().get(key)}
        return {key:self.read(self.path({'settings':'settings.json','notebook-layout':'window.json','global-marks':'global-marks.json','navigation':'navigation/study.json'}[kind]))}

    def markdown(self, value):
        lines = ['# ' + value['title'].replace('\n',' '), '', value['url'], '', '> Generated by Study Keys. Edit notes in the extension; annotations.json is the structured source.', '']
        for item in value['items']:
            lines += ['## ' + ('Archived · ' if item.get('archived') else '') + item.get('color', 'Note').title() + ' · ' + item['id'], '']
            if item.get('anchor'): lines += ['> ' + line for line in item['anchor']['quote'].splitlines()] + ['']
            if item.get('note'): lines += [item['note'], '']
        return ('\n'.join(lines) + '\n').encode()

    def apply(self, values):
        for key, value in values.items():
            kind, ident = self.key(key)
            if kind == 'agent-run':
                folder=self.folder(value['url'])
                if not self.read(folder/'page.json'): self.write(folder/'page.json',{'url':value['url'],'title':value.get('title','')})
                self.write(folder/'agent-runs'/(ident+'.json'),value)
                continue
            if kind in ('page','drawing','recovery','marks'):
                folder = self.folder(value['url'])
                if kind == 'page' or not self.read(folder / 'page.json'): self.write(folder / 'page.json', {'url':value['url'], 'title':value['title']})
                if kind == 'page':
                    self.write(folder / 'annotations.json', {'items':value['items']})
                    self.write(folder / 'notes.md', self.markdown(value), raw=True)
                elif kind == 'marks': self.write(folder / 'marks.json', value['marks'])
                elif kind == 'drawing':
                    self.write(folder / 'drawing.excalidraw', value['scene'])
                    self.write(folder / 'drawing.json', {'revision':value['revision'], 'updatedAt':value['updatedAt'], 'contentHash':digest(value['scene'])})
                else:
                    self.write(folder / 'recovery' / (ident + '.excalidraw'), value['scene'])
                    self.write(folder / 'recovery' / (ident + '.json'), {k:v for k,v in value.items() if k not in ('scene','url','title')})
            else: self.write(self.path({'settings':'settings.json','notebook-layout':'window.json','global-marks':'global-marks.json','navigation':'navigation/study.json'}[kind]), value)

    def transact(self, values):
        self.validate(values)
        journal = self.path('.pending', 'transaction.json')
        self.write(journal, values)
        self.apply(values)
        journal.unlink()

    def request(self, m):
        with self.path('.integration','library.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            journal = self.path('.pending','transaction.json')
            if journal.exists():
                pending = self.read(journal); self.validate(pending); self.apply(pending); journal.unlink()
            op = m.get('op')
            if op == 'toggleVerticalTabs':
                self.path('.integration', 'vertical-tabs-enabled')
                return toggle_vertical_tabs(self.root)
            if op == 'status': return {'folder':str(self.root),'format':'study-keys-folder','version':1,'companionVersion':'1.6.0','mcp':(self.root/'.integration/launch-mcp').is_file()}
            if op == 'get':
                values = self.get(m.get('key')); return {'values':values,'versions':{k:digest(v) for k,v in values.items()}}
            if op == 'set':
                values = m.get('values'); self.validate(values)
                for k, expected in m.get('expected', {}).items():
                    if k in values and digest(self.get(k).get(k)) != expected: raise ValueError('A local file changed in another window or Git checkout. Reopen it before saving; your draft is still here.')
                self.transact(values)
                return {'versions':{k:digest(self.get(k).get(k)) for k in values}}
            if op == 'migrate':
                values = m.get('values'); self.validate(values); existing = self.get()
                missing = {k:v for k,v in values.items() if k not in existing}
                if missing: self.transact(missing)
                return {'migrated':len(missing),'folder':str(self.root)}
            raise ValueError('Unknown local-library operation.')

OUTPUT_LOCK=threading.Lock()
def send(value):
    payload=json.dumps(value,ensure_ascii=False,separators=(',',':')).encode('utf-8')
    with OUTPUT_LOCK:
        sys.stdout.buffer.write(struct.pack('@I',len(payload)));sys.stdout.buffer.write(payload);sys.stdout.buffer.flush()

def run(root):
    store=Library(root)
    bridge=None
    while True:
        header=sys.stdin.buffer.read(4)
        if not header:
            if bridge: bridge.close()
            return
        if len(header)!=4: return
        length=struct.unpack('@I',header)[0]
        if length>MAX_INPUT: return
        data=sys.stdin.buffer.read(length)
        if len(data)!=length: return
        ident=None
        try:
            m=json.loads(data);ident=m.get('id')
            if m.get('op')=='agentResult':
                if bridge: bridge.result(m)
                continue
            if m.get('op')=='bridgeEnable':
                from bridge import BrowserBridge
                if bridge is None: bridge=BrowserBridge(store,send)
                result={'connected':True,'protocol':1,'companionVersion':'1.6.0'}
            elif m.get('op')=='bridgeDisable':
                if bridge: bridge.close()
                bridge=None;result={'connected':False}
            else: result=store.request(m)
            value={'ok':True,'value':result}
        except Exception as error:
            value={'ok':False,'error':str(error)}
        # Chrome limits each native-host response to 1 MiB. Stream larger scenes.
        encoded=base64.b64encode(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).decode('ascii')
        for i in range(0,len(encoded),512*1024):send({'id':ident,'chunk':encoded[i:i+512*1024]})
        send({'id':ident,'done':True})

if __name__=='__main__':
    root=Path(__file__).resolve().parent.parent
    if '--root' in sys.argv: root=Path(sys.argv[sys.argv.index('--root')+1])
    try:run(root)
    except Exception as error:print(str(error),file=sys.stderr);sys.exit(1)
