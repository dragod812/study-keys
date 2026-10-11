Study Keys 1.4.2 — Quiet page navigation

Removes the “The page changed. Please try again.” snackbar from routine annotation refreshes during navigation. Refreshes use the live URL, discard old-page results and failures, and retry brief sender-context races silently. Moving to another page clears the old selection and transient notifications quietly.

Real storage and save failures remain visible. Page ownership checks still reject writes to another page; saved notes and drawings stay attached to their original pages.

Validation: 41 JavaScript tests passed. Codex in-app browser checks covered navigation with an old request pending, immediate refresh on a new route, silent retry recovery, navigation during selection, and a real-error simulation that remained visible. No new permissions or dependency changes.

Reload existing tabs after updating. The Chrome Web Store update requires Google review before it becomes available there.
