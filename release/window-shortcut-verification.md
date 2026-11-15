# Capital W tab detachment — 2026-11-15

Normal-mode W uses chrome.windows.create with tabId from the authenticated message sender. It never takes a tab ID or replacement URL from the message. The live tab is checked before moving; its incognito state determines the new window's private state. Errors propagate through the existing visible command error flow. The command is non-repeating, so holding W cannot repeatedly detach the tab. Existing content-script input/Insert/IME guards and key normalization apply.

134 JavaScript tests pass, including source-tab identity, no URL recreation, private-state preservation, invalid/stale tabs and Chrome error propagation. npm run package passes the MV3 artifact audit. Native helper code did not change.

Loaded 1.7.4 locally under the original public key and ID. In a new disposable local HTML tab, typed an unsaved textarea draft, used Ctrl+C to return to Normal, and pressed Shift+W. The resulting Chrome window showed only that tab. Its draft value was unchanged and its page-load counter remained 1. The user's other tabs were not closed or reloaded. The test window is left open for inspection.

README, website and in-app command guide expose W. The Chrome Web Store 1.7.2 review remains pending; 1.7.4 has not been submitted to that blocked queue. Helper version remains 1.7.3, which is compatible.
