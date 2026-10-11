Study Keys 1.6.0 brings smaller reading controls, local-document support and an optional agent workflow that uses your existing page notebook.

## Changes

- Compact mode indicator, corner which-key menus, selection controls and notifications. Searchable help retains the full shortcut descriptions.
- Local HTML and rendered Markdown support with Chrome file access enabled; source files remain unchanged.
- `zt`, `zz` and `zb` align the active section or selection at the top, center or bottom of the reading area.
- Optional local MCP server for reading requested pages, adding highlights and notes, and editing learn-by-layers diagrams in the existing Excalidraw notebook. AI access is off by default and revocable.
- Bundled `$study-keys` Codex skill with a standalone installer and an opt-in combined MCP/skill setup. Customized skill copies are backed up before replacement.

## Update

Update both the extension and companion. Extract `study-keys-local-helper.zip` and run the installation command from the extension setup page. Add `--client codex` to configure Codex MCP and install the skill; restart or reconnect your agent afterward. Enable AI access only if you want agent operations. A cloud agent processes requested content under its own provider policies.

For local documents, enable **Allow access to file URLs** in Study Keys extension details. Markdown Viewer needs its own file access. Reload reading tabs when it is safe to discard unsaved website edits.

This remains a macOS/Linux beta requiring Chrome 131+, Python 3.11+ and Git. The local helper is required for saves. No remote library upload or automatic Git push is added.

## Verification

84 JavaScript tests and 26 Python helper tests pass. Browser checks pass 24 DOM tests and 13 reading-alignment tests, plus paragraph-range copying, ordered/deduplicated link copying, media-key isolation, note persistence, notebook drawing persistence and narrow-window layouts. The production dependency audit reports zero known vulnerabilities. Both release ZIPs and the bundled skill installer were verified.

See [release verification](https://github.com/dragod812/study-keys/blob/main/release/release-1.6.0-verification.md) and the linked installed-Chrome MCP/local-document reports for scope and limitations. Chrome Web Store availability is separate from this GitHub release and depends on Google approval.
