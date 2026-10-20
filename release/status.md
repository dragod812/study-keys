# Study Keys release status

- Chrome Web Store published version: 1.6.1 (last verified October 20, 2026)
- GitHub release: 1.6.2. Chrome Web Store update: **Pending review**, submitted October 20, 2026 with automatic publication after approval.
- Publisher name: Sidharth Padhee (saved in Web Store publisher settings)
- Public repository: https://github.com/dragod812/study-keys
- Beta release: https://github.com/dragod812/study-keys/releases/tag/v1.6.2
- Website: https://dragod812.github.io/study-keys/
- Privacy: https://dragod812.github.io/study-keys/privacy.html
- Chrome Web Store draft ID: jcjililghkknjbifgcnnkipiblmmmhid
- Submitted: package, description, Education category, English (United States), icon, 3 screenshots, promo tile, homepage, support, privacy/permission explanations, local-data disclosures, reviewer instructions.
- Distribution: Public, free of charge, all regions.
- Rechecked October 19, 2026: Google reports **Published - public**, and the Published package is **1.6.1**.
- Google flagged broad HTTP/HTTPS access for possible in-depth review. This access supports the advertised navigation and highlight restoration on visited web pages.
- Initial submission date: 2026-10-11 UTC. The 1.6.1 listing is now public; later updates require their own approval.

## Version 1.6.2 verification and publication

104 JavaScript tests and 26 native-helper tests passed again on October 20, 2026. The installed-Chrome checks cover Ctrl+C input handoff, numbered and labeled field access, YouTube playback/fullscreen, and Hello Interview article transitions, selection and the existing notebook. See [focus and media verification](focus-media-verification.md). No permissions or dependencies changed, and the existing companion does not need reinstalling.

GitHub main and the public v1.6.2 release contain the fix (`ac50b7ee538510898aadfec4334b049234b8f4ed`). Both downloaded ZIP assets match `SHA256SUMS-1.6.2.txt`; the extension ZIP contains 475 files. GitHub Pages reports a successful deployment of that commit, and the live website shows 1.6.2, its download links and the new shortcuts.

Google verified the uploaded draft package as 1.6.2. The updated 6,044-character public description and 458-character reviewer summary were saved. Submission confirmed **Your extension was submitted for review**, with **Pending review** in the dashboard on October 20, 2026 (America/Los_Angeles). Automatic publication after approval was selected. Version 1.6.1 remains public until Google approves the update. The locally installed 1.6.2 build was already reloaded and tested.

## Version 1.6.1 verification and publication

`Space h` toggles the native notes sidebar and the fallback drawer. Native × close/reopen and focus within the sidebar stay synchronized; an unfinished note is protected from shortcut dismissal. 92 JavaScript tests and installed-Chrome/Codex-browser journeys passed; see [sidebar toggle verification](sidebar-toggle-verification.md). No permissions or dependencies changed.

GitHub main and the public v1.6.1 release contain the fix. The 475-file extension ZIP matches the tested build, with no fixtures or private evidence. Both downloaded release assets match `SHA256SUMS-1.6.1.txt`. The website deployment succeeded and its release links and shortcut description show 1.6.1.

The earlier 1.6.0 review was canceled to submit the replacement. Google verified package version 1.6.1 and saved the updated listing and reviewer instructions. Submission confirmed **Pending Review** on October 11, 2026 (America/Los_Angeles), with automatic publication after approval. On October 19 the developer dashboard confirmed approval and public publication of 1.6.1.

The local unpacked Chrome extension was already reloaded and verified as 1.6.1. Refresh existing reading tabs when unsaved website edits are safe. The companion implementation is unchanged from 1.6.0; an existing 1.6.0 helper does not require an update.

## Version 1.6.0 verification and publication

84 JavaScript tests and 26 native helper tests pass. Browser regression checks, package integrity and bundled skill installation passed. See [release verification](release-1.6.0-verification.md) for results and installed-browser limitations. The release includes compact controls, local Markdown/HTML, reading alignment, the optional MCP companion and installable Codex skill.

GitHub main contains the release implementation, skill, installers and website. The public v1.6.0 release contains both ZIPs and SHA256 sums; downloading both assets verified their hashes. GitHub Pages deployment succeeded.

The earlier 1.5.0 review was canceled through the listing menu. Google accepted package version 1.6.0, the updated description, MCP/local-file permission explanations and reviewer instructions. Submission confirmed **Pending Review** on 2026-10-11 UTC, with automatic publication after approval selected. The extension is not live on the Web Store until Google approves it.

The final compact build is in the local dist folder. A reload of the installed Chrome copy could not be completed because the browser-control interface timed out; reload the unpacked extension and safe-to-refresh reading tabs to activate it locally. This limitation is separate from the successful Web Store submission.

## Version 1.5.0 verification and publication

65 JavaScript tests and 14 native helper tests passed. Production dependency audit reports zero known vulnerabilities. The package contains 469 files; its manifest and compiled scripts match the build, and fixtures, private evidence and personal library files are excluded. See [navigation verification](navigation-verification.md) for installed-Chrome, Hello Interview and Codex checks and their limits.

The website and privacy policy now describe tab/passages search, the jumplist, groups, workspaces, quick spots, unresolved questions, and the optional macOS vertical-tabs helper. The 1.5.0 package adds `tabs` and `tabGroups` permissions. The previous 1.4.2 review was canceled so the tested replacement could be submitted. Google confirmed the uploaded package version as 1.5.0 and accepted the new permission explanations, updated listing and reviewer instructions. The final confirmation read **Pending Review**, with automatic publication selected. The Web Store listing is not live until Google approves it.

GitHub `main` contains the implementation and release website. The public v1.5.0 release provides the extension ZIP, local helper ZIP and SHA256 sums; both downloaded assets match those sums. GitHub Pages successfully deployed the updated website and privacy policy. The final unpacked extension was reloaded in Chrome from `~/Code/study-keys/dist`, which displayed version 1.5.0 and Reloaded. Hello Interview document search was verified after refreshing its reading tab. Other already-open tabs should be reloaded when website edits are safe.

## Version 1.4.2 verification

41 JavaScript tests passed. Codex in-app browser checks verified quiet navigation with an old refresh pending, immediate refresh after a route change, silent sender-context retry recovery, and navigation during selection. A simulated current-page library failure remained visible. Page ownership checks still reject cross-page writes. No permissions or dependencies changed.

The Web Store package was verified as 1.4.2. The earlier 1.4.1 review was canceled and Google confirmed Pending Review for 1.4.2 with automatic publication after approval enabled. GitHub release asset hashes match the packaged files. The local unpacked extension was reloaded successfully in Chrome; its details showed version 1.4.2 and “Reloaded”. Existing tabs must be refreshed once to activate the new content script.

## Version 1.4.1 verification

36 JavaScript tests and 24 browser DOM checks passed. Codex in-app browser journeys verified command menus, paragraph labels, f hints, search/note typing and native website controls against competing player listeners and real local audio. See [verification and limitations](media-shortcuts-verification.md). Live YouTube was not tested with an installed extension in Codex. Chrome was used only to reload the installed unpacked build; its details showed 1.4.1 and Reloaded. Existing reading tabs must be reloaded for the new early keyboard handler.

The Web Store package was verified as 1.4.1 and its description updated. The linked full reviewer instructions include the media-shortcut check. The earlier 1.4.0 review was canceled; Google confirmed Pending Review for the replacement with automatic publication after approval enabled. No permissions were added. GitHub release assets match the recorded SHA256 sums, and the website deployment succeeded.

## Version 1.4.0 verification

31 JavaScript tests and 24 browser DOM tests passed. Installed Chrome E2E checks verified direct link-label copying, exact clipboard contents, duplicate URL handling, and copying on the public HTTPS website. Browser checks also covered scrolling, layout shifts, narrow viewports, clipboard failures and fast queued selections. Shared checkmarks for matching URLs are intentional. See [details](link-copy-verification.md).

The Web Store package, description and reviewer instructions were updated to 1.4.0 on 2026-10-11. Google confirmed Pending Review with automatic publication after approval enabled. The earlier 1.3.2 review was canceled to submit this update. No permissions were added.

## Earlier 1.3.2 baseline verification

27 JavaScript tests passed. 12 native host/installer tests passed. Production npm audit: zero known vulnerabilities. The installed Chrome extension reports 1.3.2, its setup page reports Connected to the existing local library, and its helper download matches the packaged helper byte-for-byte. Public website and privacy page return HTTP 200; GitHub Pages build succeeded. Store ZIP contains only extension files and helper/attributions; the public repository was assembled from an explicit file list excluding personal notes and exported articles.

The three store screenshots show original sample content and actual extension UI through the isolated browser harness. Prior installed-Chrome tests cover selection/copy, persistent highlights/notes, notebooks, insert mode, and local/global marks. No claim is made that every website or OS configuration works.
