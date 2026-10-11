"""Opt-in agent configuration, preserving unrelated settings and existing servers."""
import json,os,shutil,subprocess,tempfile,time
from pathlib import Path

def atomic_json(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.is_symlink():raise ValueError('Agent configuration must not be a symlink: '+str(path))
    fd,tmp=tempfile.mkstemp(dir=path.parent,prefix='.study-keys-')
    try:
        with os.fdopen(fd,'w') as f:json.dump(value,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)

def configure(client,launcher,home=None,platform=None):
    import sys
    home=Path(home or Path.home());platform=platform or sys.platform
    config={'command':str(launcher),'args':[]}
    if client=='codex':
        executable=shutil.which('codex')
        if not executable:raise ValueError('Codex CLI was not found. Install it or use the generated MCP configuration in setup.')
        existing=subprocess.run([executable,'mcp','get','study-keys','--json'],capture_output=True,text=True)
        if existing.returncode==0:
            previous=json.loads(existing.stdout).get('transport',{})
            if previous.get('command')!=str(launcher) or previous.get('args',[])!=[]:raise ValueError('A different study-keys MCP configuration already exists in Codex. It was not replaced.')
            return 'Codex already configured'
        subprocess.run([executable,'mcp','add','study-keys','--',str(launcher)],check=True,capture_output=True,text=True)
        return 'Codex configured; open a new agent session to load the tools'
    if client=='cursor':path=home/'.cursor/mcp.json'
    elif client=='claude-desktop':
        if platform!='darwin':raise ValueError('Claude Desktop automatic setup currently supports macOS. Use the generated JSON configuration for other clients.')
        path=home/'Library/Application Support/Claude/claude_desktop_config.json'
    else:raise ValueError('Unsupported agent client.')
    if path.is_symlink():raise ValueError('Agent configuration must not be a symlink.')
    data=json.loads(path.read_text()) if path.exists() else {}
    if not isinstance(data,dict) or not isinstance(data.get('mcpServers',{}),dict):raise ValueError('Existing agent configuration is invalid; no changes were made.')
    servers=data.setdefault('mcpServers',{})
    if 'study-keys' in servers:
        if servers['study-keys']!=config:raise ValueError('A different study-keys MCP configuration exists; it was not replaced.')
        return client+' already configured'
    if path.exists():
        backup=path.with_name(path.name+'.study-keys-backup-'+str(time.time_ns()))
        shutil.copyfile(path,backup);backup.chmod(0o600)
    servers['study-keys']=config;atomic_json(path,data)
    return client+' configured; restart or enable the MCP connection in that client'
