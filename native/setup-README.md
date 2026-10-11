# Study Keys local helper

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
