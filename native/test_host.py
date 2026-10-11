import json, subprocess, struct, base64, tempfile, unittest, sys
from pathlib import Path
from host import Library, digest
URL='https://example.com/docs/queue?version=1#/first'
PAGE={'url':URL,'title':'Queue / notes','items':[{'id':'a1','color':'yellow','note':'A local thought','anchor':{'quote':'Work has a budget'},'updatedAt':1,'archived':False}]}
SCENE={'type':'excalidraw','elements':[],'appState':{},'files':{}}
DRAW={'url':URL,'title':'Queue / notes','revision':'rev1','updatedAt':1,'scene':SCENE}
class FileStoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name);self.db=Library(self.root)
    def test_migrate_layout_and_restart(self):
        self.db.request({'op':'migrate','values':{'page:'+URL:PAGE,'drawing:'+URL:DRAW,'settings':{'https://example.com':False},'notebook-layout':{'placement':'left'}}})
        folder=self.db.folder(URL);self.assertEqual(json.loads((folder/'drawing.excalidraw').read_text()),SCENE)
        self.assertIn('A local thought',(folder/'notes.md').read_text());self.assertIn('> Work has a budget',(folder/'notes.md').read_text())
        another=Library(self.root);self.assertEqual(another.get()['page:'+URL],PAGE)
        changed={**PAGE,'title':'New title'};another.request({'op':'migrate','values':{'page:'+URL:changed}});self.assertEqual(another.get()['page:'+URL],PAGE)
    def test_url_folders_and_no_traversal(self):
        self.assertNotEqual(self.db.folder(URL),self.db.folder(URL.replace('version=1','version=2')))
        self.assertNotEqual(self.db.folder(URL),self.db.folder(URL.replace('#/first','#/second')))
        self.assertTrue(self.db.folder('https://example.com/../../weird?q=../../escape').is_relative_to(self.db.root))
        with self.assertRaises(ValueError):self.db.request({'op':'set','values':{'../../outside':{}}})
        outside=self.root/'outside';outside.mkdir();(self.root/'pages').symlink_to(outside)
        with self.assertRaises(ValueError):self.db.folder(URL)
    def test_compare_and_swap_preserves_newer_changes(self):
        key='page:'+URL;self.db.request({'op':'set','values':{key:PAGE},'expected':{key:None}})
        changed={**PAGE,'title':'Newer'};self.db.request({'op':'set','values':{key:changed},'expected':{key:digest(PAGE)}})
        with self.assertRaisesRegex(ValueError,'changed'):self.db.request({'op':'set','values':{key:PAGE},'expected':{key:digest(PAGE)}})
        self.assertEqual(self.db.get(key)[key],changed)
    def test_external_excalidraw_edit_changes_revision(self):
        self.db.request({'op':'set','values':{'drawing:'+URL:DRAW}})
        folder=self.db.folder(URL);scene={**SCENE,'elements':[{'id':'t','type':'text','text':'External edit'}]};(folder/'drawing.excalidraw').write_text(json.dumps(scene))
        drawing=self.db.get()['drawing:'+URL];self.assertTrue(drawing['revision'].startswith('file-'));self.assertEqual(drawing['scene'],scene)
    def test_journal_finishes_an_interrupted_transaction(self):
        values={'page:'+URL:PAGE,'drawing:'+URL:DRAW};self.db.write(self.db.path('.pending','transaction.json'),values)
        self.db.apply({'page:'+URL:PAGE});new=Library(self.root);new.request({'op':'status'})
        self.assertEqual(new.get()['drawing:'+URL]['scene'],SCENE);self.assertFalse((self.root/'.pending/transaction.json').exists())
    def test_invalid_batch_never_writes_valid_prefix(self):
        with self.assertRaises(ValueError):self.db.request({'op':'set','values':{'page:'+URL:PAGE,'page:https://bad.example':{'url':'https://bad.example','title':'Bad','items':[{}]}}})
        self.assertEqual(self.db.get(),{})
    def test_large_native_protocol_and_unicode(self):
        data={**PAGE,'title':'Unicode 日本語 📝','items':[{**PAGE['items'][0],'note':'large'}]};drawing={**DRAW,'scene':{**SCENE,'files':{'image':{'dataURL':'data:image/png;base64,'+'A'*1500000}}}}
        msgs=[{'id':1,'op':'set','values':{'page:'+URL:data,'drawing:'+URL:drawing}},{'id':2,'op':'get','key':None}]
        raw=b''
        for msg in msgs:
            payload=json.dumps(msg).encode();raw+=struct.pack('@I',len(payload))+payload
        proc=subprocess.run([sys.executable,str(Path(__file__).with_name('host.py')),'--root',str(self.root)],input=raw,capture_output=True,check=True)
        chunks={};done={};buf=proc.stdout
        while buf:
            size=struct.unpack('@I',buf[:4])[0];self.assertLess(size,1024*1024);message=json.loads(buf[4:4+size]);buf=buf[4+size:]
            if 'chunk' in message:chunks.setdefault(message['id'],[]).append(message['chunk'])
            if message.get('done'):done[message['id']]=json.loads(base64.b64decode(''.join(chunks[message['id']])))
        self.assertTrue(done[1]['ok']);self.assertEqual(done[2]['value']['values']['page:'+URL]['title'],data['title']);self.assertEqual(done[2]['value']['values']['drawing:'+URL]['scene'],drawing['scene'])
    def test_marks_have_per_page_and_global_files(self):
        mark={'url':URL,'title':'Queue','updatedAt':100,'position':{'x':0,'y':350,'pageX':0,'pageY':0,'pane':'#reader','anchor':None,'viewportY':0}}
        values={'marks:'+URL:{'url':URL,'title':'Queue','marks':{'a':mark}},'global-marks':{'A':mark}}
        self.db.request({'op':'set','values':values})
        self.assertEqual(json.loads((self.db.folder(URL)/'marks.json').read_text()),{'a':mark})
        self.assertEqual(json.loads((self.db.root/'global-marks.json').read_text()),{'A':mark})
        self.assertEqual(Library(self.root).get(),values)
    def test_new_palette_colors_persist_without_losing_legacy_questions(self):
        items=[{**PAGE['items'][0],'id':'color-'+color,'color':color} for color in ['yellow','blue','green','orange','purple','red','pink']]
        value={**PAGE,'items':items};self.db.request({'op':'set','values':{'page:'+URL:value}})
        self.assertEqual(Library(self.root).get()['page:'+URL]['items'],items)
if __name__=='__main__':unittest.main()
