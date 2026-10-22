import copy
import base64
import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from host import Library


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        self.project = self.root / 'project'
        self.project.mkdir()
        self.file = self.project / "Notes ' with spaces.md"
        self.file.write_bytes(b'# Queue\r\n\r\nWait for quota.\r\n')
        self.url = self.file.as_uri()
        self.store = Library(self.root / 'library')

    def call(self, op, **kwargs):
        return self.store.request({'op': op, 'url': self.url, **kwargs})

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.project), *args]).decode()

    def initialize_git(self):
        self.git('init', '-q')
        self.git('config', 'user.email', 'fixture@example.test')
        self.git('config', 'user.name', 'Test Fixture')
        self.git('config', 'core.autocrlf', 'false')
        self.git('add', '--', self.file.name)
        self.git('commit', '-qm', 'Fixture baseline')

    def test_exact_file_permission_and_revoke(self):
        self.assertTrue(self.call('reviewLoad')['needsGrant'])
        data = self.call('reviewGrant')
        self.assertEqual(data['document']['source'], '# Queue\r\n\r\nWait for quota.\r\n')
        other = self.project / 'other.md'; other.write_text('Private')
        self.assertTrue(self.store.request({'op': 'reviewLoad', 'url': other.as_uri()})['needsGrant'])
        self.call('reviewRevoke')
        self.assertTrue(self.call('reviewLoad')['needsGrant'])

    def test_cas_comments_rounds_and_source_immutability(self):
        original = self.file.read_bytes()
        data = self.call('reviewGrant')
        state = data['state']
        state['comments'] = [{'id': 'c1', 'text': 'Explain admission.', 'hash': data['document']['hash'], 'status': 'open', 'line': 3}]
        saved = self.call('reviewSave', state=state, expected=None)['state']
        with self.assertRaisesRegex(ValueError, 'another tab'):
            self.call('reviewSave', state=state, expected=None)
        round_state = copy.deepcopy(saved)
        round_state['rounds'].append({'hash': data['document']['hash'], 'prompt': 'Review this file'})
        second = self.call('reviewSave', state=round_state, expected=saved['revision'])['state']
        with self.assertRaisesRegex(ValueError, 'cannot be changed'):
            self.call('reviewSave', state=saved, expected=second['revision'])
        self.assertEqual(self.file.read_bytes(), original)
        self.file.write_text('# Queue\n\nAdmission begins only when quota is available.\n')
        latest = self.call('reviewLoad')
        self.assertEqual(latest['previous'].encode(), original)
        self.assertEqual(latest['state']['comments'][0]['line'], 3)
        self.assertNotEqual(latest['previousHash'], latest['document']['hash'])
        next_round = copy.deepcopy(second)
        next_round['rounds'].append({'hash': data['document']['hash'], 'prompt': 'Stale'})
        # Agent edits never block copying feedback from the reviewed document.
        third = self.call('reviewSave', state=next_round, expected=second['revision'])['state']
        restarted = Library(self.root / 'library')
        self.assertEqual(restarted.request({'op': 'reviewLoad', 'url': self.url})['state'], third)

    def test_git_reads_index_worktree_without_staging(self):
        self.initialize_git()
        committed = self.file.read_text()
        self.file.write_text('# Queue\n\nStaged wording.\n')
        self.git('add', '--', self.file.name)
        self.file.write_text('# Queue\n\nUnstaged wording.\n')
        index = (self.project / '.git/index').read_bytes()
        data = self.call('reviewGrant')
        self.assertNotIn('head', data['git'])
        self.assertIn('Staged wording', data['git']['index'])
        self.assertEqual((self.project / '.git/index').read_bytes(), index)
        self.assertIn('Unstaged wording', data['document']['source'])

    def test_untracked_document_in_git_has_empty_baselines(self):
        self.initialize_git()
        other = self.project / 'New.html'; other.write_text('<h1>New</h1>')
        data = self.store.request({'op': 'reviewGrant', 'url': other.as_uri()})
        self.assertTrue(data['git']['untracked'])
        self.assertEqual(data['git']['index'], '')

    def test_stage_only_current_file_including_partial_staging(self):
        self.initialize_git()
        other = self.project / 'Other.md'
        other.write_text('Unrelated staged file')
        self.git('add', '--', other.name)
        other_index = self.git('show', ':Other.md')
        other.write_text('Unrelated unstaged edit')
        self.file.write_text('# Reviewed baseline\n')
        self.git('add', '--', self.file.name)
        data = self.call('reviewGrant')
        state = data['state']
        state['rounds'] = [{'hash': data['document']['hash'], 'prompt': 'First handoff'}]
        self.call('reviewSave', state=state, expected=None)
        self.file.write_text('# Agent revision\n')
        current = self.call('reviewLoad')
        self.assertTrue(self.call('reviewStage')['staged'])
        self.assertEqual(self.git('show', ':' + self.file.name), '# Agent revision\n')
        self.assertEqual(self.file.read_text(), '# Agent revision\n')
        self.assertEqual(self.git('show', ':Other.md'), other_index)
        self.assertEqual(other.read_text(), 'Unrelated unstaged edit')
        self.assertEqual(self.call('reviewLoad')['git']['index'], '# Agent revision\n')

    def test_no_git_is_a_noop_and_handoff_survives_removed_source(self):
        data = self.call('reviewGrant')
        self.assertIsNone(data['git'])
        self.assertFalse(self.call('reviewStage')['staged'])
        self.assertFalse((self.project / '.git').exists())
        self.file.unlink()
        state = data['state']; state['rounds'] = [{'hash': data['document']['hash'], 'prompt': 'Feedback'}]
        self.assertEqual(self.call('reviewSave', state=state, expected=None)['state']['rounds'][0]['prompt'], 'Feedback')

    def test_referenced_images_have_distinct_index_and_working_bytes(self):
        diagram = self.project / 'diagram.svg'
        diagram.write_text('<svg><text>Before</text></svg>')
        self.file.write_text('# Diagrams\n\n![diagram](diagram.svg)\n')
        self.initialize_git(); self.git('add', '--', diagram.name)
        self.call('reviewGrant')
        diagram.write_text('<svg><text>After</text></svg>')
        before = self.call('reviewAsset', ref='diagram.svg', side='before')
        after = self.call('reviewAsset', ref='diagram.svg', side='after')
        self.assertIn(b'Before', base64.b64decode(before['chunk']))
        self.assertIn(b'After', base64.b64decode(after['chunk']))
        self.assertNotEqual(before['hash'], after['hash'])
        self.assertEqual(before['mime'], 'image/svg+xml')
        self.assertIsNone(before['next'])
        with self.assertRaisesRegex(ValueError, 'not referenced'):
            self.call('reviewAsset', ref='private.png')
        diagram.unlink()
        self.assertIn(b'Before', base64.b64decode(self.call('reviewAsset', ref='diagram.svg', side='before')['chunk']))

    def test_image_chunks_grants_symlinks_and_supported_references(self):
        from review import IMAGE_CHUNK, image_references
        image = self.project / 'diagram (new).png'
        raw = b'PNG fixture' * 100000
        image.write_bytes(raw)
        self.file.write_text('![image](<diagram (new).png>)\n')
        self.assertTrue(self.call('reviewAsset', ref=image.name)['needsGrant'])
        self.call('reviewGrant')
        first = self.call('reviewAsset', ref='diagram%20(new).png')
        self.assertEqual(first['next'], IMAGE_CHUNK)
        chunks = [first['chunk']]; next_offset = first['next']
        while next_offset is not None:
            value = self.call('reviewAsset', ref=image.name, offset=next_offset)
            chunks.append(value['chunk']); next_offset = value['next']
        self.assertEqual(base64.b64decode(''.join(chunks)), raw)
        self.assertEqual(image_references('![x](diagram(one).svg)\n![x][ref]\n[ref]: <other file.png>\n<img src="test.svg">'),
                         {'diagram(one).svg', 'other file.png', 'test.svg'})
        image.unlink(); image.symlink_to(self.file)
        with self.assertRaises(OSError): self.call('reviewAsset', ref=image.name)
        self.call('reviewRevoke')
        self.assertTrue(self.call('reviewStage')['needsGrant'])

    def test_remote_image_only_returns_referenced_url_without_fetching(self):
        self.file.write_text('![x](https://example.test/chart.png)')
        self.call('reviewGrant')
        self.assertEqual(self.call('reviewAsset', ref='https://example.test/chart.png'), {'remote': 'https://example.test/chart.png'})
        with self.assertRaises(ValueError): self.call('reviewAsset', ref='https://elsewhere.test/chart.png')

    def test_symlinks_binary_oversize_and_invalid_urls_rejected(self):
        linked = self.project / 'linked.md'; linked.symlink_to(self.file)
        with self.assertRaises(OSError):
            self.store.request({'op': 'reviewGrant', 'url': linked.as_uri()})
        self.call('reviewGrant')
        self.file.unlink(); self.file.symlink_to(self.project / 'missing.md')
        with self.assertRaises(OSError): self.call('reviewLoad')
        for value in ['file:///etc/passwd', 'https://example.test/a.md', 'file://server/a.md', 'file:///a%2fb.md']:
            with self.assertRaises(ValueError):
                self.store.request({'op': 'reviewGrant', 'url': value})
        self.file.unlink(); self.file.write_bytes(b'\0')
        with self.assertRaisesRegex(ValueError, 'Binary'): self.call('reviewGrant')
        self.file.write_bytes(b'a' * (2 * 1024 * 1024 + 1))
        with self.assertRaises(ValueError): self.call('reviewGrant')

    def test_draft_and_unicode_survive_restart(self):
        data = self.call('reviewGrant')
        state = data['state']; state['draft'] = {'text': 'Explain café / 日本語 / 🙂', 'hash': data['document']['hash']}
        self.call('reviewSave', state=state, expected=None)
        self.assertEqual(self.call('reviewLoad')['state']['draft'], state['draft'])
