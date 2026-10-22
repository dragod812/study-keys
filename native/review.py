"""Document review, referenced images and explicit single-file staging."""
import base64
import hashlib
import html
import json
import os
import re
import stat
import subprocess
import tempfile
import uuid
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, quote, urlsplit, urljoin

LIMIT = 2 * 1024 * 1024
HASH = re.compile(r'^[a-f0-9]{64}$')


def source_path(url):
    u = urlsplit(url)
    raw = unquote(u.path, errors='strict')
    if (u.scheme != 'file' or u.netloc or u.query or u.fragment or not raw.startswith('/')
            or re.search(r'%(?:2f|5c|00)', u.path, re.I) or re.search(r'[\\\x00-\x1f]', raw)
            or Path(raw).suffix.lower() not in ('.md', '.markdown', '.mdown', '.mkd', '.mkdn', '.html', '.htm')
            or '..' in Path(raw).parts):
        raise ValueError('Choose a local Markdown or HTML document.')
    return Path(raw)


def read_bytes(path, limit=LIMIT):
    # Walk with openat + NOFOLLOW so a renamed directory or symlink cannot
    # redirect an existing document grant to another file.
    descriptor = os.open('/', os.O_RDONLY | os.O_DIRECTORY)
    try:
        parts = path.parts[1:]
        for part in parts[:-1]:
            child = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = child
        file_descriptor = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=descriptor)
        with os.fdopen(file_descriptor, 'rb') as source:
            info = os.fstat(source.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_size > limit:
                raise ValueError('This file exceeds the review size limit or is not a regular file.')
            raw = source.read(limit + 1)
            after = os.fstat(source.fileno())
            if (info.st_size, info.st_mtime_ns, info.st_ctime_ns) != (after.st_size, after.st_mtime_ns, after.st_ctime_ns):
                raise ValueError('The document changed while being read. Load the latest revision again.')
            if len(raw) > limit:
                raise ValueError('File exceeds the review size limit.')
            return raw
    finally:
        os.close(descriptor)


def read_source(path):
    raw = read_bytes(path)
    text = raw.decode('utf-8')
    if '\0' in text:
        raise ValueError('Binary documents cannot be reviewed.')
    return {'source': text, 'hash': hashlib.sha256(raw).hexdigest()}


def git(directory, *args, optional=False, limit=LIMIT):
    # Fixed operations and literal paths, never caller-supplied commands.
    environment = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    environment.update(GIT_CONFIG_NOSYSTEM='1', GIT_CONFIG_GLOBAL=os.devnull,
                       GIT_OPTIONAL_LOCKS='0', GIT_TERMINAL_PROMPT='0')
    with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
        result = subprocess.run(
            ['git', '--no-pager', '--literal-pathspecs', '-c', 'core.fsmonitor=false',
             '-c', 'core.hooksPath=' + os.devnull, '-C', str(directory), *args],
            stdout=out, stderr=err, env=environment, timeout=8, check=False)
        if result.returncode:
            if optional:
                return None
            err.seek(0)
            detail = err.read(1000).decode('utf-8', errors='replace').strip()
            raise ValueError('Git operation failed: ' + detail)
        out.seek(0)
        data = out.read(limit + 1)
        if len(data) > limit:
            raise ValueError('Git object exceeds the review size limit.')
        return data


def git_state(path, working):
    try:
        root = git(path.parent, 'rev-parse', '--show-toplevel', optional=True)
    except FileNotFoundError:
        return None
    if root is None:
        return None
    root = Path(os.fsdecode(root.rstrip(b'\n')))
    relative = path.relative_to(root).as_posix()
    entries = git(root, 'ls-files', '--stage', '-z', '--', relative).split(b'\0')
    entries = [x.split(b'\t', 1)[0].split() for x in entries if x]
    conflicted = any(x[2] != b'0' for x in entries)
    def blob(ident):
        if not ident:
            return ''
        if not re.fullmatch(rb'[a-f0-9]{40,64}', ident):
            raise ValueError('Invalid Git object.')
        if int(git(root, 'cat-file', '-s', ident.decode())) > LIMIT:
            raise ValueError('Git revision exceeds the 2 MiB review limit.')
        return git(root, 'cat-file', 'blob', ident.decode()).decode('utf-8')
    if any(x[0] not in (b'100644', b'100755') for x in entries):
        raise ValueError('Only regular document files can be compared.')
    index_entry = next((x for x in entries if x[2] == b'0'), None)
    if conflicted:
        index_entry = next((x for x in entries if x[2] == b'2'), None)
    index_text = blob(index_entry[1] if index_entry else None)
    return {'root': str(root), 'relative': relative, 'index': index_text,
            'conflicted': conflicted, 'untracked': not entries}


IMAGE_LIMIT = 8 * 1024 * 1024
IMAGE_CHUNK = 384 * 1024  # Each native message stays below Chrome's 1 MiB ceiling.
IMAGE_TYPES = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
               '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif'}


def image_references(source):
    class Images(HTMLParser):
        def __init__(self):
            super().__init__()
            self.refs = set()
        def handle_starttag(self, tag, attrs):
            if tag.lower() == 'img':
                src = dict(attrs).get('src')
                if src:
                    self.refs.add(src)
    parser = Images()
    parser.feed(source)
    refs = parser.refs
    # Inline Markdown destinations, including balanced parentheses and <spaces>.
    for match in re.finditer(r'!\[(?:\\.|[^\]\\])*\]\(\s*', source):
        rest = source[match.end():]
        if rest.startswith('<'):
            dest = rest[1:].split('>', 1)[0]
        else:
            level = 0
            end = 0
            escaped = False
            for end, char in enumerate(rest):
                if escaped:
                    escaped = False
                    continue
                if char == '\\':
                    escaped = True
                    continue
                if char == '(':
                    level += 1
                elif char == ')':
                    if not level:
                        break
                    level -= 1
                elif char.isspace() and not level:
                    break
            dest = rest[:end]
        refs.add(html.unescape(re.sub(r'\\([!"#$%&\'()*+,\-./:;<=>?@\[\]\\^_`{|}~])', r'\1', dest)))
    for match in re.finditer(r'^ {0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))', source, re.M):
        refs.add(html.unescape(match[1] or match[2]))
    return refs


def asset(store, path, document, message):
    ref = message.get('ref')
    side = message.get('side', 'after')
    if not isinstance(ref, str) or len(ref) > 20000 or side not in ('before', 'after'):
        raise ValueError('Invalid image reference.')
    info = git_state(path, document['source']) if side == 'before' else None
    source = info['index'] if info else document['source']
    # Only images actually referenced by this granted document are readable.
    def canonical(value):
        u = urlsplit(urljoin(path.as_uri(), value))
        return u._replace(path=quote(unquote(u.path), safe='/'), fragment='').geturl()
    candidates = {canonical(value) for value in image_references(source)}
    target = urljoin(path.as_uri(), ref)
    if canonical(ref) not in candidates:
        raise ValueError('This image is not referenced by the document.')
    url = urlsplit(target)
    if url.scheme in ('https', 'http'):
        if url.username or url.password:
            raise ValueError('Image URLs cannot include credentials.')
        return {'remote': target}
    if url.scheme != 'file' or url.netloc or url.query:
        raise ValueError('Unsupported image URL.')
    raw_path = unquote(url.path, errors='strict')
    if re.search(r'[\\\x00-\x1f]', raw_path):
        raise ValueError('Invalid image path.')
    image = Path(os.path.normpath(raw_path))
    mime = IMAGE_TYPES.get(image.suffix.lower())
    if not mime:
        raise ValueError('Unsupported image format.')
    raw = None
    if info and image.is_relative_to(info['root']):
        relative = image.relative_to(info['root']).as_posix()
        records = git(info['root'], 'ls-files', '--stage', '-z', '--', relative)
        entries = [x.split(b'\t', 1)[0].split() for x in records.split(b'\0') if x]
        entry = next((x for x in entries if x[2] == b'0'), None)
        if entry and entry[0] in (b'100644', b'100755'):
            ident = entry[1].decode()
            if int(git(info['root'], 'cat-file', '-s', ident)) > IMAGE_LIMIT:
                raise ValueError('This image exceeds 8 MiB. Open the original to view it.')
            raw = git(info['root'], 'cat-file', 'blob', ident, limit=IMAGE_LIMIT)
        else:
            # Never silently replace an old image with its current revision.
            return {'missing': True, 'hash': 'missing'}
    if raw is None:
        raw = read_bytes(image, IMAGE_LIMIT)
    offset = message.get('offset', 0)
    if type(offset) is not int or offset < 0 or offset > len(raw):
        raise ValueError('Invalid image chunk.')
    end = min(len(raw), offset + IMAGE_CHUNK)
    return {'chunk': base64.b64encode(raw[offset:end]).decode(), 'mime': mime,
            'next': end if end < len(raw) else None, 'hash': hashlib.sha256(raw).hexdigest()}


def handle(store, message):
    op = message['op']
    url = message.get('url', '')
    path = source_path(url)
    folder = store.folder(url) / 'review'
    access_path = store.path('.integration', 'review-documents.json')
    grants = store.read(access_path, [])
    if op == 'reviewRevoke':
        store.write(access_path, [p for p in grants if p != str(path)])
        return {'revoked': True}
    if op == 'reviewGrant':
        read_source(path)  # Validate before persisting an exact-file grant.
        store.write(access_path, sorted(set(grants + [str(path)])))
    elif str(path) not in grants:
        return {'needsGrant': True, 'path': str(path)}
    document = read_source(path) if op != 'reviewSave' else None
    if op == 'reviewAsset':
        return asset(store, path, document, message)
    if op == 'reviewStage':
        info = git_state(path, document['source'])
        if info is None:
            return {'staged': False, 'reason': 'outside-git'}
        # The user's explicit Stage file action. No shell and no recursive paths.
        git(info['root'], 'add', '--', info['relative'])
        return {'staged': True}
    if op == 'reviewProbe':
        return {'hash': document['hash']}
    if document:
        snapshot = store.path('.snapshots', document['hash'] + '.txt')
        if not snapshot.exists():
            store.write(snapshot, document['source'].encode('utf-8'), raw=True)
    state_path = folder / 'review.json'
    state = store.read(state_path, {'revision': None, 'comments': [], 'draft': None, 'rounds': []})
    if op == 'reviewSave':
        if message.get('expected') != state['revision']:
            raise ValueError('This review changed in another tab. Reload the review; your draft has been kept.')
        next_state = message.get('state')
        if not isinstance(next_state, dict) or len(json.dumps(next_state)) > LIMIT:
            raise ValueError('Invalid or oversized review.')
        comments = next_state.get('comments')
        rounds = next_state.get('rounds')
        if not isinstance(comments, list) or len(comments) > 2000 or not isinstance(rounds, list) or len(rounds) > 500:
            raise ValueError('Review limit reached. Export or archive this review before continuing.')
        ids = set()
        for comment in comments:
            if (not isinstance(comment, dict) or not isinstance(comment.get('id'), str)
                    or comment['id'] in ids or len(comment['id']) > 80
                    or comment.get('status') not in ('open', 'resolved')
                    or not isinstance(comment.get('text'), str) or len(comment['text']) > 100000
                    or not HASH.fullmatch(comment.get('hash', ''))):
                raise ValueError('Invalid review comment.')
            ids.add(comment['id'])
        # Existing handoffs are immutable. Editing feedback creates another round.
        if rounds[:len(state['rounds'])] != state['rounds'] or len(rounds) > len(state['rounds']) + 1:
            raise ValueError('Existing review handoffs cannot be changed.')
        if len(rounds) > len(state['rounds']):
            latest = rounds[-1]
            if not HASH.fullmatch(latest.get('hash', '')):
                raise ValueError('Invalid saved review snapshot.')
            if not isinstance(latest.get('prompt'), str) or len(latest['prompt']) > LIMIT:
                raise ValueError('Invalid handoff.')
        state = {**next_state, 'url': url, 'revision': str(uuid.uuid4())}
        store.write(state_path, state)
        return {'state': state}
    if op not in ('reviewLoad', 'reviewGrant'):
        raise ValueError('Unsupported review operation.')
    previous = state['rounds'][-1]['hash'] if state['rounds'] else document['hash']
    if not HASH.fullmatch(previous):
        raise ValueError('Invalid saved review revision.')
    previous_path = store.path('.snapshots', previous + '.txt')
    previous_source = previous_path.read_bytes().decode('utf-8') if previous_path.exists() else None
    try:
        git_info = git_state(path, document['source'])
    except (OSError, ValueError, subprocess.TimeoutExpired):
        git_info = None  # Repository metadata never prevents reading or commenting.
    if git_info:
        for key in ('index',):
            raw = git_info[key].encode('utf-8')
            ident = hashlib.sha256(raw).hexdigest()
            git_info[key + 'Hash'] = ident
            snapshot = store.path('.snapshots', ident + '.txt')
            if not snapshot.exists():
                store.write(snapshot, raw, raw=True)
    return {'document': {**document, 'path': str(path), 'url': url},
            'state': state, 'previous': previous_source, 'previousHash': previous,
            'git': git_info}
