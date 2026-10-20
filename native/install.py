#!/usr/bin/env python3
"""Register Study Keys' local-only native host for this user's Chrome."""
import argparse,json,os,re,shlex,shutil,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--extension-id',required=True);p.add_argument('--enable-vertical-tabs',action='store_true',help='Opt in to the fixed macOS Chrome vertical-tabs Accessibility action');p.add_argument('--client',action='append',choices=['codex','cursor','claude-desktop'],default=[],help='Configure this agent client; codex also installs the $study-keys skill. Repeat for more clients. Omit to leave agent settings and skills unchanged.');args=p.parse_args()
if sys.platform not in ('darwin','linux'):raise SystemExit('This beta supports macOS and Linux only.')
if args.enable_vertical_tabs and sys.platform!='darwin':raise SystemExit('The vertical-tabs helper currently supports macOS Chrome only.')
if sys.version_info<(3,11):raise SystemExit('Install Python 3.11 or later before setting up Study Keys.')
if not shutil.which('git'):raise SystemExit('Install Git before setting up Study Keys.')
if not re.fullmatch('[a-p]{32}',args.extension_id):p.error('Use the extension ID shown by chrome://extensions.')
root=Path.home()/'.study-keys'
if root.is_symlink():raise SystemExit('Use a real ~/.study-keys directory, not a symlink.')
root.mkdir(mode=0o700,exist_ok=True)
integration=root/'.integration';integration.mkdir(mode=0o700,exist_ok=True)
if integration.is_symlink():raise SystemExit('Integration folder must not be a symlink.')
for name in ['host.py','bridge.py','mcp_server.py','setup_clients.py','review.py']:
    target=integration/name
    if target.is_symlink():raise SystemExit('Integration files must not be symbolic links.')
    shutil.copyfile(Path(__file__).with_name(name),target)
if args.enable_vertical_tabs:
    (integration/'vertical-tabs-enabled').write_text('Enabled by the user through the local installer.\n')
launcher=integration/'launch-host'
if launcher.is_symlink():raise SystemExit('Launchers must not be symbolic links.')
launcher.write_text('#!/bin/sh\nexec '+shlex.quote(sys.executable)+' '+shlex.quote(str(integration/'host.py'))+' "$@"\n');launcher.chmod(0o700)
mcp_launcher=integration/'launch-mcp'
if launcher.is_symlink() or mcp_launcher.is_symlink():raise SystemExit('Launchers must not be symbolic links.')
mcp_launcher.write_text('#!/bin/sh\nexec '+shlex.quote(sys.executable)+' '+shlex.quote(str(integration/'mcp_server.py'))+' "$@"\n');mcp_launcher.chmod(0o700)
location=Path.home()/('Library/Application Support/Google/Chrome/NativeMessagingHosts' if sys.platform=='darwin' else '.config/google-chrome/NativeMessagingHosts');location.mkdir(parents=True,exist_ok=True)
manifest={'name':'com.studykeys.local','description':'Study Keys local library in ~/.study-keys','path':str(launcher),'type':'stdio','allowed_origins':['chrome-extension://'+args.extension_id+'/']}
try:
    prior=json.loads((location/'com.studykeys.local.json').read_text())
    manifest['allowed_origins']=sorted(set(manifest['allowed_origins']+[o for o in prior.get('allowed_origins',[]) if re.fullmatch(r'chrome-extension://[a-p]{32}/',o)]))
except (OSError,ValueError):pass
(location/'com.studykeys.local.json').write_text(json.dumps(manifest,indent=2)+'\n')
for name in ['README.md','.gitignore']:
    target=root/name
    if not target.exists():shutil.copyfile(Path(__file__).with_name('library-'+name.lstrip('.')),target)
# Raw review snapshots stay local even when the annotation library is in Git.
ignore=root/'.gitignore'
if ignore.is_symlink():raise SystemExit('The library ignore file cannot be a symbolic link.')
if '.snapshots/' not in ignore.read_text().splitlines():
    with ignore.open('a') as f:f.write('\n.snapshots/\n')
if not (root/'.git').exists():subprocess.run(['git','init','--quiet','--initial-branch=main',str(root)],check=True)
print('Installed local library:',root)
print('Chrome native host:',location/'com.studykeys.local.json')
print('MCP server:',mcp_launcher)
config={'mcpServers':{'study-keys':{'command':str(mcp_launcher),'args':[]}}}
config_path=integration/'mcp-config.json'
if config_path.is_symlink():raise SystemExit('MCP configuration must not be a symlink.')
config_path.write_text(json.dumps(config,indent=2)+'\n');config_path.chmod(0o600)
sys.path.insert(0,str(Path(__file__).parent))
from setup_clients import configure
for client in args.client:
    try:
        print(configure(client,mcp_launcher))
        if client=='codex':
            from install_skill import install_skill,describe
            print(describe(install_skill()))
    except Exception as error:raise SystemExit('Companion installed. Agent setup needs attention: '+str(error))
print('Reload the extension, enable AI access in Study Keys setup, and check the connection.')
print('For other MCP clients, import:',config_path)
