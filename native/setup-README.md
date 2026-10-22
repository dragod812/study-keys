# Study Keys companion: local library + MCP

This beta supports macOS and Linux with Google Chrome, Python 3.11+ and Git.
The helper is required for saving highlights, notes, drawings and scroll marks.
The browser store cannot install it automatically.

1. Extract this ZIP into a folder.
2. Open Study Keys → Set up local folder. Copy the install command, which contains your actual extension ID.
3. Open a terminal in this extracted folder and run that command:

   `python3 install.py --extension-id YOUR_EXTENSION_ID`

4. Use Check connection on the setup page, then reload a webpage.

The installer creates `~/.study-keys`, initializes a local Git repository if needed, and registers `com.studykeys.local` for that extension ID. It copies the helper into the library's `.integration` directory; this downloaded folder can then be removed. By default the helper offers library operations only, with no network or general command-execution API. It does not upload, commit or push your library.

If switching from an unpacked extension to the store version, disable the old extension and run the command again with the new ID. This adds the new extension ID to the registration; existing authorized IDs and the library are retained. Do not run two copies of the keyboard extension together.

If the helper is unavailable, the extension can read its cached library but will not claim a successful save. Restore the helper connection before editing. Export backups from the library UI, and keep copies of the local folder.

## Removing the integration

Uninstalling the extension does not erase the folder or helper registration. To stop the integration, remove `com.studykeys.local.json` from `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/` on macOS, or `~/.config/google-chrome/NativeMessagingHosts/` on Linux. Preserve your library and backups before manually removing any files. `.integration` contains the installed helper; the rest of `~/.study-keys` contains your reading data and Git history.

## Optional native vertical-tabs toggle (macOS Chrome)

Run the same install command with `--enable-vertical-tabs` to enable `Space s`. This adds one fixed UI action: click Chrome’s native “Expand Tabs” or “Collapse Tabs” button. Enable vertical tabs in Chrome first. macOS may require Accessibility and Automation access for Chrome. The helper never accepts an arbitrary script, command, app name, or UI target. It skips webpage content. Currently this requires the English Chrome button labels. Linux and Codex’s browser do not expose this native toggle through this integration.

Remove `~/.study-keys/.integration/vertical-tabs-enabled` to turn this optional action off; ordinary folder saving keeps working.

## Local Markdown support

Version 1.5.2 supports local Markdown and HTML identities. Rerun this installer to update an older helper before saving on local documents. Enable Allow access to file URLs for Study Keys (and Markdown Viewer if used) in Chrome, then reload the document. Annotations and drawings go under `~/.study-keys/pages/local-files/`; the helper never reads or edits the source document.


## One-time AI setup (1.6.0)

The same ZIP now installs both folder saving and the MCP server. Python 3.11+ and Git are the only companion dependencies. No model key or extra generation service is needed.

1. Select Codex (MCP + skill), Cursor, or Claude Desktop (macOS) on the extension setup page.
2. Run the generated command, for example `python3 install.py --extension-id YOUR_EXTENSION_ID --client codex`. Repeat `--client` for more clients. With no `--client`, existing agent settings are untouched.
3. Reload the extension and enable **Allow connected local AI agents** in setup.
4. Reconnect/restart your agent client. In Codex, use `$study-keys https://example.com/article`. Other clients can ask `study keys -> https://example.com/article`, or use the `study_page` MCP prompt.

Selecting `--client codex` also installs the bundled skill into `$CODEX_HOME/skills/study-keys`, or `~/.codex/skills/study-keys` by default. For a skill-only install/update, run `python3 install_skill.py` from this extracted folder. No npm packages or extension ID are needed for this command; the MCP and browser still need their normal setup. Use `--codex-home /path/to/codex-config` to select another configuration directory. Rerunning the installer preserves identical files, and backs up changed installations under `skill-backups/study-keys/` in the Codex directory before replacing them. The backup is kept outside skill discovery and its path is printed. The installer does not download updates; use a current companion ZIP first.

The installer preserves unrelated settings and refuses to replace a different existing `study-keys` MCP entry. JSON client configurations get a local backup. Codex is registered using its CLI. Other clients can import `~/.study-keys/.integration/mcp-config.json`; its command launches the MCP server over stdio. The installer reports a missing client instead of claiming setup succeeded.

Keep Chrome running with the extension enabled for live page and notebook tools. Basic MCP status works with Chrome closed. Agents use the same annotations and drawing.excalidraw as the UI. Exact quotes are verified, revisions protect concurrent edits, and stable request IDs prevent duplicate retries. Diagrams contain editable frames, shapes, text and arrows. The MCP reads visible/rendered top-document content; it reports collapsed native details sections and unsupported embedded frames/canvas text. It does not bypass website login or access restrictions.

Turn AI access off in setup to stop the browser bridge. To remove Codex registration, run `codex mcp remove study-keys`; remove only the `study-keys` entry in other clients. Your reading library stays intact. Client configuration may expose requested content to that client's model provider. Study Keys itself has no network listener and no AI service call.

## Document review in 1.7.1

Run the installer again to update the helper. Existing registration IDs, notes and notebooks are retained. Review reads individually approved Markdown/HTML sources, their referenced images and fixed Git index queries. Exact-file grants are kept in `.integration/review-documents.json` and can be revoked from the reader. Raw snapshots are in `.snapshots/`; the installer adds that directory to the library Git ignore file. The helper never edits source files. The explicit Stage file / Space r g action stages only the approved document via a fixed git add command. It does not stage image files or other paths. Outside Git it is a no-op; the reader hides Git controls. Back up snapshots separately if you need review history on another device.
