#!/usr/bin/env python3
"""Register Study Keys' local-only native host for this user's Chrome."""
import argparse,json,os,re,shlex,shutil,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--extension-id',required=True);args=p.parse_args()
if sys.platform not in ('darwin','linux'):raise SystemExit('This beta supports macOS and Linux only.')
if sys.version_info<(3,11):raise SystemExit('Install Python 3.11 or later before setting up Study Keys.')
if not shutil.which('git'):raise SystemExit('Install Git before setting up Study Keys.')
if not re.fullmatch('[a-p]{32}',args.extension_id):p.error('Use the extension ID shown by chrome://extensions.')
root=Path.home()/'.study-keys'
if root.is_symlink():raise SystemExit('Use a real ~/.study-keys directory, not a symlink.')
root.mkdir(mode=0o700,exist_ok=True)
integration=root/'.integration';integration.mkdir(mode=0o700,exist_ok=True)
if integration.is_symlink():raise SystemExit('Integration folder must not be a symlink.')
shutil.copyfile(Path(__file__).with_name('host.py'),integration/'host.py')
launcher=integration/'launch-host'
launcher.write_text('#!/bin/sh\nexec '+shlex.quote(sys.executable)+' '+shlex.quote(str(integration/'host.py'))+' "$@"\n');launcher.chmod(0o700)
location=Path.home()/('Library/Application Support/Google/Chrome/NativeMessagingHosts' if sys.platform=='darwin' else '.config/google-chrome/NativeMessagingHosts');location.mkdir(parents=True,exist_ok=True)
manifest={'name':'com.studykeys.local','description':'Study Keys local library in ~/.study-keys','path':str(launcher),'type':'stdio','allowed_origins':['chrome-extension://'+args.extension_id+'/']}
(location/'com.studykeys.local.json').write_text(json.dumps(manifest,indent=2)+'\n')
for name in ['README.md','.gitignore']:
    target=root/name
    if not target.exists():shutil.copyfile(Path(__file__).with_name('library-'+name.lstrip('.')),target)
if not (root/'.git').exists():subprocess.run(['git','init','--quiet','--initial-branch=main',str(root)],check=True)
print('Installed local library:',root)
print('Chrome native host:',location/'com.studykeys.local.json')
