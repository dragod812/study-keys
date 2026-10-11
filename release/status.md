# Study Keys release status

- Version: 1.5.0
- Publisher name: Sidharth Padhee (saved in Web Store publisher settings)
- Public repository: https://github.com/dragod812/study-keys
- Beta release: https://github.com/dragod812/study-keys/releases/tag/v1.5.0
- Website: https://dragod812.github.io/study-keys/
- Privacy: https://dragod812.github.io/study-keys/privacy.html
- Chrome Web Store draft ID: jcjililghkknjbifgcnnkipiblmmmhid
- Submitted: package, description, Education category, English (United States), icon, 3 screenshots, promo tile, homepage, support, privacy/permission explanations, local-data disclosures, reviewer instructions.
- Distribution: Public, free of charge, all regions.
- Google confirmed 1.5.0 submission: Pending Review. Publisher contact email verified. Automatic publication after approval is enabled.
- Google flagged broad HTTP/HTTPS access for possible in-depth review. This access supports the advertised navigation and highlight restoration on visited web pages.
- Submission date: 2026-10-11 UTC. The listing is not live on the Web Store until approved.

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
