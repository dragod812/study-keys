"""Exercise installer registration in a temporary home; never touch the user's library."""
import contextlib,io,json,runpy,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch

INSTALLER=Path(__file__).with_name('install.py')
EXTENSION='abcdefghijklmnopabcdefghijklmnop'
class InstallerTests(unittest.TestCase):
    def invoke(self,root,platform='darwin',extension=EXTENSION,git=True,vertical=False):
        with patch.object(sys,'argv',[str(INSTALLER),'--extension-id',extension]+(['--enable-vertical-tabs'] if vertical else [])),patch.object(sys,'platform',platform),patch.object(sys,'version_info',(3,11,0)),patch('pathlib.Path.home',return_value=root),patch('shutil.which',return_value='/usr/bin/git' if git else None),patch('subprocess.run') as run,contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
            runpy.run_path(str(INSTALLER),run_name='__main__')
            return run
    def test_platform_registration_and_existing_library(self):
        for platform,folder in [('darwin','Library/Application Support/Google/Chrome/NativeMessagingHosts'),('linux','.config/google-chrome/NativeMessagingHosts')]:
            with self.subTest(platform=platform),tempfile.TemporaryDirectory() as temp:
                root=Path(temp);library=root/'.study-keys';library.mkdir();(library/'keep.json').write_text('{"note":"keep"}')
                run=self.invoke(root,platform)
                manifest=json.loads((root/folder/'com.studykeys.local.json').read_text())
                self.assertEqual(manifest['allowed_origins'],['chrome-extension://'+EXTENSION+'/'])
                self.assertEqual(manifest['name'],'com.studykeys.local')
                self.assertTrue(Path(manifest['path']).is_file())
                self.assertEqual((library/'keep.json').read_text(),'{"note":"keep"}')
                self.assertTrue((library/'.integration/host.py').is_file())
                self.assertEqual(run.call_args.args[0],['git','init','--quiet','--initial-branch=main',str(library)])
    def test_invalid_platform_id_and_missing_git_do_not_write(self):
        for options in [{'platform':'win32'},{'extension':'bad-id'},{'git':False}]:
            with self.subTest(options=options),tempfile.TemporaryDirectory() as temp:
                root=Path(temp)
                with self.assertRaises(SystemExit):self.invoke(root,**options)
                self.assertEqual(list(root.iterdir()),[])
    def test_opt_in_and_existing_origin_are_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);self.invoke(root)
            self.assertFalse((root/'.study-keys/.integration/vertical-tabs-enabled').exists())
            other='ponmlkjihgfedcbaponmlkjihgfedcba';self.invoke(root,extension=other,vertical=True)
            manifest=json.loads((root/'Library/Application Support/Google/Chrome/NativeMessagingHosts/com.studykeys.local.json').read_text())
            self.assertEqual(len(manifest['allowed_origins']),2)
            self.assertTrue((root/'.study-keys/.integration/vertical-tabs-enabled').is_file())
    def test_existing_git_repository_is_not_reinitialized(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'.study-keys/.git').mkdir(parents=True)
            self.invoke(root).assert_not_called()
if __name__=='__main__':unittest.main()
