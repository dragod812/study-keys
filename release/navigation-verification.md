# Study Keys 1.5.0 navigation verification

Verified October 11, 2026. This report records the pre-release checks for version 1.5.0. See [release status](status.md) for publication status.

## Build and automated checks

- `npm test`: **65 passed, 0 failed**.
- `npm run test:native`: **14 passed, 0 failed**.
- `npm run package`: successful; generated `study-keys-chrome.zip` and `dist/`.
- `git diff --check`: clean.
- Loaded and reloaded the unpacked build from `~/Code/study-keys/dist`; Chrome displayed **1.5.0** with the approved tabs and tabGroups permissions.
- Installed and enabled the optional fixed macOS vertical-tabs helper for the existing unpacked extension ID.

Automated coverage includes URL validation, escaped literal search and Unicode offsets, passage matching, filters, jumplist deduplication/branching/limits, worker recreation, previous-tab switching after extension-driven activation, search coverage, discarded-tab exclusion, native group mutations/focus restoration, quick spots, workspace persistence, pinned result reopening, backup merge and rejection, resolved-question persistence, keyboard event ownership, highlights, drawings, conflicts, disk writes/recovery, and installer registration/opt-in.

The follow-up run added regressions for duplicate URLs in separate same-name workspace groups; retaining discarded-tab checkpoints without waking the tab; quick spots in different scroll panes; reverse traversal of pinned results; concurrent search/checkpoint preservation; and extension-update invalidation versus transient service-worker errors. The five navigation regressions failed before their fixes and now pass. Existing backups remain compatible with optional workspace `groupKey` identities.

## Hello Interview and update recovery

Reproduced a stale content script in the existing Chrome Hello Interview tab: the Space menu opened but tab search reported that Study Keys was updated/disconnected. A page reload restored communication. Site shortcuts were enabled and Chrome had access to the site.

Verified the final installed bundle on the live Introduction article:

- `Space d s`, `assessment`: two document results; choosing a result jumped to its passage.
- `v`: visible word labels appeared and followed the page's article layout.
- `v`, Space, `p`, then start/end labels `ax` / `ac`: selected two complete adjacent paragraphs. Labels depend on the viewport; those codes describe this test only.
- `Space h`: native side panel displayed the two existing annotations and reported local-folder storage.
- Drawing notebook opened, maximized, restored and closed; it reported **Saved to ~/.study-keys**. Existing annotations remained present.
- Navigated through the site's How to Prepare link; document search for `foundation` returned three results on that article without a manual reload. Returned to Introduction afterward.
- Reloaded the extension deliberately while Introduction remained open. The stale tab displayed the new persistent **Study Keys updated · Reload to reconnect** badge. Clicking it offered explicit page reload; that reload restored working document search. No automatic website reload is performed and saved notes remain local.

In a separate Chrome test window, saved two identical URLs at scroll positions **0 px** and **416 px**, each in its own group named `Study Keys Duplicate E2E`. After changing position and restoring the workspace, a fresh save independently confirmed both original positions and two distinct group identities. One background tab initially deferred restoration; its capture and the final local file confirmed completion. Both clearly named duplicate-workspace test records remain under `~/.study-keys/navigation/study.json`; the temporary window was closed.

Codex's separate in-app browser initially had the older menu on Kueue and no Study Keys host on Hello Interview. After the user reloaded that installation on October 11, the Hello Interview tab had one extension host and the new navigation menu. Document search for `assessment` returned its heading, and choosing it moved to the article section. Word labels selected the exact phrase “The interviewers conducting system design interviews.” Saving a yellow highlight and editing it entirely by keyboard succeeded; the note survived reload, was searchable in the fallback annotation sidebar, and was independently confirmed in the local annotations file. Only the clearly marked `Study Keys Codex E2E` annotation was then moved to reversible Trash; the other four active annotations were preserved.

In the same Codex tab, `v`, Space, `p` followed by start/end paragraph labels selected two complete adjacent paragraphs. The copy command returned to Normal mode, indicating its clipboard write completed, but Browser Use's separate virtual clipboard remained empty and could not validate the clipboard text. The tab-title picker returned the known Kueue tab; native tab activation was not certified from this observation.

**Codex notebook loading — manually verified:** On October 11, the user confirmed that `Space d n` loads the Excalidraw canvas normally on Hello Interview in Codex. The blank canvas observed during automation was not reproduced in normal use, so no notebook-loading workaround was introduced. During automation, the floating shell opened but its frame timed out twice; supported diagnostics showed a canceled document load (`net::ERR_ABORTED`) without an application exception. The precise cause of that automation-only result remains undetermined. Canvas loading is user-verified; full canvas editing and persistence in Codex were not independently verified by automation. Chrome notebook checks and local annotation persistence checks remain documented separately. No browser-security settings were changed or bypassed.

## Real Chrome keyboard journeys

Used a separate temporary test window with installed-extension fixtures (preview script removed), then the live Kueue overview page.

| Journey | Observed result |
| --- | --- |
| `Space s`, twice | Chrome's actual **Expand Tabs / Collapse Tabs** button changed state; the native vertical strip expanded and collapsed. |
| `i`, Escape, Ctrl+C | Escape preserved Insert mode; Ctrl+C returned to Normal, after which the group command opened. |
| `Space g n` | Created `Study Keys E2E` from the current tab. |
| `Space g m` | Moved the second test website into that native group. |
| `Space g f`, `Space Enter` | Search reported exactly the two tabs in the focused group. |
| `Space Enter`, title query, Enter | Switched from the essay fixture to the concurrency guide. |
| `Space p s`, `question` | Returned three passages from the essay, with coverage for the two scoped tabs. |
| Select a passage, Ctrl+o, Ctrl+i | Switched to the essay passage, back to the guide, then forward to the essay again. |
| `Space Space`, twice | Switched between the two most recent tabs in both directions. |
| `3]]` | Focused the third guide heading, “Queues and fairness.” |
| `Space e a`, reload, `Space e e` | Quick spot remained available after reload. |
| `Space w s`, close one fixture, `Space w o` | Saved two pages and reopened the missing page in the named group without duplicating the existing page. |
| Pin filtered cross-tab results, `Space j` | Opened the first pinned result in the other tab. |
| Kueue `/ quota`, Enter, n | Found five occurrences and reported “Match 2 of 5.” |
| Kueue `Space d s`, `fair sharing` | Returned three readable passages, including the quota/fair-sharing explanation. |
| Final reload, nested app `Space d s`, `rollback` | Final installed bundle returned the expected passage with a whole-word excerpt. |

The quick spot and two-page workspace were also independently checked in the actual file `~/.study-keys/navigation/study.json`. The clearly named test workspace and test quick spot remain available for inspection. Temporary Chrome test tabs/window were closed; existing user groups were not changed.

## Codex in-app browser preview journeys

Used an isolated iframe fixture so the already installed extension and development preview could not both handle the same keys.

- Literal search, fuzzy passage selection, counted heading navigation and jumplist restoration passed.
- On a 430 × 800 viewport, the passage picker and annotation editor fit, the selected result remained reachable, and a question note could be created and marked resolved.
- The question appeared in `Space p q` while unresolved, disappeared after resolution, and its persisted test record contained `resolved: true`.
- In the nested scrolling runbook, selecting the rollback passage moved the main pane to **649 px**; Ctrl+o restored **0 px**; Ctrl+i restored **649 px**.
- After scrolling away from the passage, `zz` restored its centered position (**468 → 649 px**).
- Reset the temporary viewport override afterward.

The automated input tool did not reliably deliver the Insert-exit chord in the iframe preview; that exact behavior was instead verified in the real installed Chrome extension. The iframe transport has only one simulated browser tab, so native tab/group integration was tested in Chrome, not claimed from preview results.

## Scope and platform limits

- `Space s` is the browser vertical-tabs toggle, never the Study Keys notes sidebar. `Space h` opens the notes sidebar.
- Native vertical-tabs integration currently requires macOS Google Chrome, English button labels, enabled vertical tabs, explicit helper opt-in, and the required macOS access. Linux and Codex's native browser sidebar are unsupported.
- Passage searches inspect loaded readable main-document content, not unopened pages, unloaded tabs, embedded frames, closed disclosures or editable inputs. Coverage is shown in the picker.
- Tab groups and jumplists use Chrome APIs/session storage; explicit quick spots and workspaces persist in the local library and its backups. No cloud search index or library upload is involved.
- Existing tabs need a page reload after the extension reload to receive the new content script.
- Chrome's “Read your browsing history” permission wording here comes from `tabs`; the manifest does not request the `history` API.

## Local evidence

Generated artifacts are in the ignored `.preview/` folder:

- [Native vertical tabs expanded](../.preview/evidence/chrome-vertical-tabs.jpg)
- [Kueue fuzzy search](../.preview/evidence/kueue-fuzzy-search.jpg)
- [Narrow document search](../.preview/evidence/narrow-document-search.jpg)
- [Hello Interview word labels](../.preview/evidence/hello-interview-word-labels.jpg)
- [Hello Interview paragraph selection](../.preview/evidence/hello-interview-paragraph-selection.jpg)
- [Hello Interview reconnect action](../.preview/evidence/hello-interview-reconnect.jpg)
- [Codex paragraph selection](../.preview/evidence/codex-hello-interview-paragraphs.jpg)
- [Codex note restored after reload](../.preview/evidence/codex-hello-interview-note.jpg)
- `navigation-tests.log`, `navigation-native-tests.log`, `navigation-build.log`

## Final release checks

The release package was rebuilt after the documentation/privacy updates. All 65 JavaScript and 14 native tests passed again; `npm audit --omit=dev` reported zero vulnerabilities. The 469-file ZIP excludes fixtures, private evidence and personal library files. Both assets downloaded from GitHub v1.5.0 match `SHA256SUMS-1.5.0.txt`. GitHub Pages built successfully from the release commit; the live shortcut guide and updated privacy policy were verified. The responsive shortcut table had no horizontal page overflow at 430 px.

The final unpacked Chrome build was reloaded from `~/Code/study-keys/dist`; its details showed 1.5.0 and Reloaded. After refreshing the existing Hello Interview Introduction tab, `Space d s` / `assessment` returned two results. No user annotations were changed by these final release checks.
