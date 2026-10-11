#!/usr/bin/env python3
"""Exercise a configured MCP server over stdio; save full responses to a file."""
import argparse,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('request');p.add_argument('output');p.add_argument('--launcher',default=str(Path.home()/'.study-keys/.integration/launch-mcp'));a=p.parse_args()
request=json.loads(Path(a.request).read_text())
messages=[{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-11-25','capabilities':{},'clientInfo':{'name':'study-keys-e2e-agent','version':'1'}}},{'jsonrpc':'2.0','method':'notifications/initialized'},{'jsonrpc':'2.0','id':2,'method':request.get('method','tools/call'),'params':request.get('params',request)}]
result=subprocess.run([a.launcher],input='\n'.join(json.dumps(m) for m in messages)+'\n',text=True,capture_output=True,timeout=90,check=True)
replies=[json.loads(l) for l in result.stdout.splitlines()];reply=next(r for r in replies if r.get('id')==2);Path(a.output).write_text(json.dumps(reply,indent=2,ensure_ascii=False)+'\n')
if reply.get('error') or reply.get('result',{}).get('isError'):print(json.dumps(reply));raise SystemExit(1)
value=reply['result'];data=value.get('structuredContent',{})
print(json.dumps({'saved':a.output,'keys':list(data),'items':len(data.get('page',{}).get('items',[])),'drawingElements':len((data.get('drawing') or {}).get('scene',{}).get('elements',[])),'sourceCharacters':len(data.get('source',{}).get('text','')),'browsers':data.get('browsers')},ensure_ascii=False))
