# Link-copy verification — 1.4.0

Verified 2026-10-11 on macOS Chrome and the isolated browser harness.

- `d` labels visible links directly on the page. Typing a label copies the full destination and exits; no dialog opens and no link is activated.
- `Shift+D` / `D` retains labels and copies unique URLs in chosen order, one per line. Copied links show a green checkmark. Escape finishes; the next session starts fresh.
- Installed Chrome: pasted the exact two-line and three-line clipboard lists into the fixture textarea, including a mailto URL. Duplicate destinations stayed at two entries. A single relative destination retained both its full query and fragment.
- Installed Chrome on the public HTTPS Study Keys website: copied the repository destination by its label; the page did not navigate.
- Browser harness: page scroll preserved the collection, a below-fold link received a new label, and an 85px layout shift moved hints to the matching link rectangles without changing existing codes. No modal was present.
- Browser harness: rejected clipboard writes left the count and checkmarks unchanged; retry worked after recovery. Deliberately delayed writes accepted rapid successive labels in order, and Escape waited for already chosen links.
- Narrow 480px viewport: hint and status-bar bounds stayed within the viewport. Original viewport restored after testing.
- 31 JavaScript tests passed, including URL fidelity, ordered/deduplicated writes, rejected writes, concurrent-write protection, and prefix-free stable short hint codes.
- 24 browser DOM tests passed, including hidden, collapsed, obscured and scroll-clipped links and changed destinations.

No new permissions or remote services. The native helper and persisted library format are unchanged. Browser-internal pages, closed shadow roots, embedded frames and canvas content retain the beta's existing limitations. This is not a claim of compatibility with every website.

At the user’s request, version 1.4.0 replaces the earlier 1.3.2 Web Store submission. Shared copied indicators for matching URLs are intentionally retained.
