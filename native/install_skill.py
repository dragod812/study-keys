#!/usr/bin/env python3
"""Install the bundled Codex skill; preserve earlier copies outside skill discovery."""
import argparse
from datetime import datetime, timezone
import os
from pathlib import Path
import shutil
import tempfile
import uuid


def bundled_skill():
    here = Path(__file__).resolve().parent
    # Extracted companion / dist/native first, repository checkout second.
    for folder in (here / 'skills/study-keys', here.parent / 'skills/study-keys'):
        if (folder / 'SKILL.md').is_file():
            return folder
    raise ValueError('Bundled study-keys skill is missing. Download the complete companion ZIP or use the repository checkout.')


def snapshot(folder):
    if folder.is_symlink() or not folder.is_dir():
        raise ValueError('Skill must be a real directory, not a file or symbolic link: ' + str(folder))
    files = {}
    for path in sorted(folder.rglob('*')):
        if path.is_symlink():
            raise ValueError('Skill contains a symbolic link; it was not changed: ' + str(path))
        if path.is_file():
            files[str(path.relative_to(folder))] = path.read_bytes()
        elif not path.is_dir():
            raise ValueError('Unsupported special file in skill: ' + str(path))
    return files


def install_skill(source=None, codex_home=None):
    source = Path(source) if source is not None else bundled_skill()
    files = snapshot(source)
    if b'name: study-keys' not in files.get('SKILL.md', b'') or 'agents/openai.yaml' not in files:
        raise ValueError('The bundled skill is incomplete; nothing was installed.')
    base = Path(codex_home or os.environ.get('CODEX_HOME') or Path.home() / '.codex').expanduser().absolute()
    parent = base / 'skills'
    target = parent / 'study-keys'
    if target.is_symlink():
        raise ValueError('Existing study-keys skill is a symbolic link. Update its source instead: ' + str(target))
    if target.exists() and snapshot(target) == files:
        return {'status': 'unchanged', 'path': str(target), 'backup': None}
    base.mkdir(parents=True, exist_ok=True)
    parent.mkdir(parents=True, exist_ok=True)
    backup = None
    # Stage the complete directory before moving the existing installation.
    with tempfile.TemporaryDirectory(prefix='.study-keys-skill-', dir=base) as temp:
        staged = Path(temp) / 'study-keys'
        shutil.copytree(source, staged)
        if snapshot(staged) != files:
            raise ValueError('Skill source changed during installation. Run the installer again.')
        if target.exists():
            backups = base / 'skill-backups' / 'study-keys'
            backups.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            backup = backups / (stamp + '-' + uuid.uuid4().hex[:8])
            os.replace(target, backup)
        try:
            os.replace(staged, target)
        except OSError:
            if backup is not None:
                os.replace(backup, target)
            raise
    return {'status': 'updated' if backup else 'installed', 'path': str(target), 'backup': str(backup) if backup else None}


def describe(result):
    message = 'Codex $study-keys skill ' + result['status'] + ': ' + result['path']
    if result['backup']:
        message += '\nPrevious skill preserved at: ' + result['backup']
    return message


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--codex-home', type=Path, help='Codex configuration directory (default: CODEX_HOME or ~/.codex).')
    args = parser.parse_args()
    try:
        print(describe(install_skill(codex_home=args.codex_home)))
    except (OSError, ValueError) as error:
        parser.exit(1, 'Skill installation failed: ' + str(error) + '\n')
    print('Open a fresh Codex session and use: $study-keys https://example.com/article')
    print('The Study Keys MCP and Chrome AI access must also be configured.')


if __name__ == '__main__':
    main()
