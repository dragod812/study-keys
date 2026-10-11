# Reading alignment verification

Verified October 11, 2026, against the current local 1.5.2 build.

`zt`, `zz`, and `zb` align the active heading or selected passage at the top, center, and bottom of its own scrolling area. Visual and Highlight selections remain available for subsequent actions. The selection toolbar is excluded from the reading area. Site scroll padding is respected; document boundaries limit how far alignment can move.

## Checks

- All 70 JavaScript tests passed; the production package built successfully and `git diff --check` passed.
- The browser fixture ran 13 DOM geometry checks with zero failures at the normal viewport and at 430 × 800. Checks cover all three alignments in page/nested scrolling, range preservation, outer-scroll isolation, boundary clamping, toolbar clearance, and hidden/detached targets.
- Real keyboard input in Codex's isolated preview verified the `z` command menu and all three commands. Page heading measurements were approximately 64 px at the top, 700 px at the bottom, and 382 px at center, matching the padded reading area within one CSS pixel.
- Nested keyboard alignment placed the heading at approximately 110 px / 657 px; the outer document remained at scrollY 0.
- Selected two paragraphs by labels, used `zb` and `zt`, then canceled the `z` prefix with Escape without losing Visual mode. Highlight mode also remained active after `zb`. The bottom of the selected passage stayed above the toolbar after the clearance fix.
- Website inputs accepted `zt zb` as ordinary text. Insert mode passed the new letter sequences and Escape through. The existing Ctrl+C exit was not independently certified through the Codex automation path in this check.
- Chose a heading through the keyboard outline picker and aligned it. No annotation records were created or modified.
- Reloaded the existing unpacked Chrome installation from `~/Code/study-keys/dist`. Chrome showed version 1.5.2 and Reloaded. A separate temporary fixture tab, with the preview script removed, displayed the new menu and visibly aligned the target heading at the top and bottom using the installed extension. The temporary tab was closed.
- The ZIP's content script matches `dist/content.js`, includes the alignment commands and excludes test fixtures.

The working tree already contained separate local-document changes; they were preserved. This task updated the local build and documentation sources, without making a GitHub or Web Store release. Existing reading tabs need a page reload; Codex's separate extension installation needs its own reload.

## Reproduce

Run `npm run preview`, then open `http://127.0.0.1:8788/fixtures/alignment-runner.html` in Codex. The iframe isolates the development content script from an installed top-frame extension. Use **Run checks**, then **Page scroll** or **Nested scroll** and type `zt`, `zz`, or `zb`. For installed Chrome, use `http://127.0.0.1:8788/fixtures/alignment.html?installed=1`.

Screenshots stay in the ignored `.preview/evidence/` directory: `alignment-guide.jpg`, `alignment-chrome-top.jpg`, and `alignment-chrome-bottom.jpg`.
