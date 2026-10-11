import json,os,subprocess,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from mcp_server import Server,TOOLS,validate
from setup_clients import configure
from host import Library

class MCPTests(unittest.TestCase):
    def test_protocol_over_real_stdio_and_no_startup_noise(self):
        with tempfile.TemporaryDirectory() as root:
            requests=[{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-11-25'}},{'jsonrpc':'2.0','method':'notifications/initialized'},{'jsonrpc':'2.0','id':2,'method':'tools/list'},{'jsonrpc':'2.0','id':3,'method':'prompts/get','params':{'name':'study_page','arguments':{'url':'https://example.com'}}},{'jsonrpc':'2.0','id':4,'method':'tools/call','params':{'name':'status'}}]
            p=subprocess.run([sys.executable,str(Path(__file__).with_name('mcp_server.py')),'--root',root],input='\n'.join(json.dumps(r) for r in requests)+'\n',text=True,capture_output=True,check=True)
            replies=[json.loads(l) for l in p.stdout.splitlines()]
            self.assertEqual([r['id'] for r in replies],[1,2,3,4]);self.assertEqual(replies[0]['result']['protocolVersion'],'2025-11-25')
            self.assertIn('apply_study_changes',[t['name'] for t in replies[1]['result']['tools']]);self.assertIn('CURRENT notebook',replies[2]['result']['messages'][0]['content']['text']);self.assertFalse(replies[3]['result']['structuredContent']['browsers'])
    def test_errors_are_tool_results_and_unknown_operations_are_not_forwarded(self):
        with tempfile.TemporaryDirectory() as root:
            server=Server(root);server.request('initialize',{})
            for name,args in [('shell',{}),('add_note',{'url':'x'}),('read_page',{'url':'https://example.com','evaluate':'steal()'})]:
                with patch('mcp_server.dispatch') as call:
                    self.assertTrue(server.request('tools/call',{'name':name,'arguments':args})['isError']);call.assert_not_called()
    def test_optional_json_client_setup_preserves_unrelated_settings_and_does_not_overwrite_server(self):
        with tempfile.TemporaryDirectory() as root:
            home=Path(root);path=home/'.cursor/mcp.json';path.parent.mkdir();path.write_text(json.dumps({'mcpServers':{'other':{'command':'keep'}},'other-setting':True}))
            configure('cursor','/test/launch-mcp',home=home);data=json.loads(path.read_text());self.assertTrue(data['other-setting']);self.assertEqual(data['mcpServers']['other'],{'command':'keep'});self.assertEqual(len(list(path.parent.glob('*backup*'))),1)
            configure('cursor','/test/launch-mcp',home=home)
            with self.assertRaises(ValueError):configure('cursor','/different/launch-mcp',home=home)
            self.assertEqual(json.loads(path.read_text()),data)
    def test_agent_runs_share_native_transaction_and_are_recovered(self):
        with tempfile.TemporaryDirectory() as root:
            store=Library(root);url='https://example.com/';run={'id':'test','url':url,'title':'Example','status':'applied','requestHash':'abc','annotationChanges':[],'drawingChanges':[],'updatedAt':1};page={'url':url,'title':'Example','items':[]}
            values={'page:'+url:page,'agent-run:test':run}
            store.write(store.path('.pending','transaction.json'),values)
            result=store.request({'op':'get'})['values'];self.assertEqual(result['agent-run:test'],run);self.assertFalse(store.path('.pending','transaction.json').exists())
            self.assertTrue((store.folder(url)/'agent-runs/test.json').is_file())

if __name__=='__main__':unittest.main()
