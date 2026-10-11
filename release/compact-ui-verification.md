# Compact reading controls — 2026-10-11

The mode indicator now shows a small state pill with a help entry. Saved counts
remain in its accessible label and tooltip. Which-key uses short labels from
the existing command registry, two columns for longer menus, and a single
1–9 row for quick spots. Nested menus, selection controls and the keyboard
guide sit at the lower right. Notifications use a smaller top-right toast.

## Verification

- `npm test`: 84 tests passed, including registry-derived hint filtering and
  quick-spot grouping without inventing missing key bindings.
- `npm run package`: extension and helper packages built successfully.
- `git diff --check`: passed.
- Codex browser, isolated preview: Space menu → document submenu → Escape;
  word labels → select a sentence → highlight palette → save yellow highlight;
  searchable `?` help; shortcut error notification; keyboard return to reading.
- Tested desktop, 390 × 844 and 320 × 568 viewport overrides. Corrected the
  scrollbar-width overflow found during the narrow-window check. Menus, help
  and notifications remain within the layout viewport with no inner horizontal
  overflow. Reset the temporary viewport override afterward.
- At the initial desktop size, the mode pill measured 84 × 26 CSS pixels,
  the Space menu 380 × 247, and word-selection instructions 460 × 85.
- Production notes were not used: the highlight was saved in `.preview/test-data.json`.

## Installation status

`dist` and the release ZIPs contain the new UI. The installed Chrome extension
reload was not completed: the extension settings page rendered blank and
native Chrome control subsequently timed out. No new permissions were requested.
Reload the existing unpacked Study Keys extension from `chrome://extensions`,
then refresh the website tab. Codex's independently loaded copy also needs a
reload through its extension settings.

The browser preview runs alongside the old installed extension in Insert mode;
the older gray badge in preview screenshots belongs to that installed copy.
The subsequent 1.6.0 release pass pushed these changes to GitHub and submitted the package to the Web Store. See [release status](status.md) for the verified publication state and remaining local reload limitation.
