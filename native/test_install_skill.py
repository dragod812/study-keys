"""Skill installation tests use isolated directories, never the live Codex setup."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from install_skill import bundled_skill, install_skill, snapshot


class SkillInstallerTests(unittest.TestCase):
    def test_install_is_idempotent_and_uses_the_selected_codex_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp) / 'custom codex'
            result = install_skill(codex_home=base)
            target = base / 'skills/study-keys'
            self.assertEqual(result['status'], 'installed')
            self.assertEqual(snapshot(target), snapshot(bundled_skill()))
            before = (target / 'SKILL.md').stat().st_mtime_ns
            self.assertEqual(install_skill(codex_home=base)['status'], 'unchanged')
            self.assertEqual((target / 'SKILL.md').stat().st_mtime_ns, before)
            self.assertFalse((base / 'skill-backups').exists())

    def test_update_preserves_customizations_outside_skill_discovery(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp);install_skill(codex_home=base)
            target = base / 'skills/study-keys'
            (target / 'SKILL.md').write_text('My customized study instructions')
            (target / 'personal.txt').write_text('Keep this too')
            old = snapshot(target)
            result = install_skill(codex_home=base)
            self.assertEqual(result['status'], 'updated')
            self.assertEqual(snapshot(Path(result['backup'])), old)
            self.assertEqual(snapshot(target), snapshot(bundled_skill()))
            self.assertFalse(Path(result['backup']).is_relative_to(base / 'skills'))

    def test_failed_replacement_restores_the_previous_skill(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp);install_skill(codex_home=base)
            target = base / 'skills/study-keys';(target / 'SKILL.md').write_text('Keep this version')
            old = snapshot(target);replace = os.replace;calls = 0
            def fail_install(source, destination):
                nonlocal calls
                calls += 1
                if calls == 2:
                    raise OSError('Simulated rename failure')
                return replace(source, destination)
            with patch('install_skill.os.replace', side_effect=fail_install):
                with self.assertRaisesRegex(OSError, 'Simulated'):
                    install_skill(codex_home=base)
            self.assertEqual(snapshot(target), old)
            self.assertFalse(list(base.glob('.study-keys-skill-*')))

    def test_bad_source_and_symlink_destination_leave_existing_work_untouched(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp);other = base / 'elsewhere';other.mkdir();(other / 'keep').write_text('Preserve')
            skills = base / 'skills';skills.mkdir();(skills / 'study-keys').symlink_to(other, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'symbolic link'):
                install_skill(codex_home=base)
            self.assertEqual((other / 'keep').read_text(), 'Preserve')
            with self.assertRaisesRegex(ValueError, 'incomplete'):
                install_skill(source=other, codex_home=base / 'untouched')
            self.assertFalse((base / 'untouched').exists())

    def test_extracted_companion_cli_works_outside_its_working_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp);bundle = base / 'extracted companion';bundle.mkdir()
            shutil.copyfile(Path(__file__).with_name('install_skill.py'), bundle / 'install_skill.py')
            shutil.copytree(bundled_skill(), bundle / 'skills/study-keys')
            target = base / 'codex config'
            result = subprocess.run([sys.executable, str(bundle / 'install_skill.py'), '--codex-home', str(target)], cwd=base, capture_output=True, text=True, check=True)
            self.assertIn('skill installed', result.stdout)
            self.assertEqual(snapshot(target / 'skills/study-keys'), snapshot(bundled_skill()))


if __name__ == '__main__':
    unittest.main()
