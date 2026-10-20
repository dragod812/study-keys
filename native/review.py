"""Read-only source access and durable review rounds for explicitly allowed documents."""
import hashlib
import json
import os
import re
import stat
import subprocess
import tempfile
import uuid
from pathlib import Path
from urllib.parse import unquote, urlsplit

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


def read_source(path):
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
            if not stat.S_ISREG(info.st_mode) or info.st_size > LIMIT:
                raise ValueError('Review supports regular UTF-8 documents up to 2 MiB.')
            raw = source.read(LIMIT + 1)
            after = os.fstat(source.fileno())
            if (info.st_size, info.st_mtime_ns, info.st_ctime_ns) != (after.st_size, after.st_mtime_ns, after.st_ctime_ns):
                raise ValueError('The document changed while being read. Load the latest revision again.')
            if len(raw) > LIMIT:
                raise ValueError('Document exceeds the 2 MiB review limit.')
            text = raw.decode('utf-8')
            if '\0' in text:
                raise ValueError('Binary documents cannot be reviewed.')
            return {'source': text, 'hash': hashlib.sha256(raw).hexdigest()}
    finally:
        os.close(descriptor)


def git(directory, *args, optional=False):
    # Fixed object/index inspection only: no diff drivers, textconv, hooks,
    # fsmonitor, pager, external command or caller-supplied Git arguments.
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
            raise ValueError('Git could not read this revision. Check the repository before continuing.')
        out.seek(0)
        data = out.read(LIMIT + 1)
        if len(data) > LIMIT:
            raise ValueError('Git revision exceeds the 2 MiB review limit.')
        return data


def git_state(path, working):
    root = git(path.parent, 'rev-parse', '--show-toplevel', optional=True)
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
    head = git(root, 'ls-tree', '-z', 'HEAD', '--', relative, optional=True)
    head_fields = head.split(b'\t', 1)[0].split() if head else []
    if head_fields and head_fields[0] not in (b'100644', b'100755'):
        raise ValueError('The committed document is not a regular file.')
    head_text = blob(head_fields[2] if head_fields else None)
    index_text = blob(entries[0][1] if entries and not conflicted else None)
    return {'root': str(root), 'relative': relative, 'head': head_text, 'index': index_text,
            'conflicted': conflicted, 'untracked': not entries,
            'partiallyStaged': bool(entries and head_text != index_text and index_text != working)}


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
    document = read_source(path)
    if op == 'reviewProbe':
        return {'hash': document['hash']}
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
            if latest.get('hash') != document['hash']:
                raise ValueError('The source changed. Load the latest revision before copying the handoff.')
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
    git_info = git_state(path, document['source'])
    if git_info:
        for key in ('head', 'index'):
            raw = git_info[key].encode('utf-8')
            ident = hashlib.sha256(raw).hexdigest()
            git_info[key + 'Hash'] = ident
            snapshot = store.path('.snapshots', ident + '.txt')
            if not snapshot.exists():
                store.write(snapshot, raw, raw=True)
        git_info['reviewBaseline'] = bool(state['rounds'] and git_info['indexHash'] == previous)
    return {'document': {**document, 'path': str(path), 'url': url},
            'state': state, 'previous': previous_source, 'previousHash': previous,
            'git': git_info}
