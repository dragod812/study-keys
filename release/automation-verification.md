# Release automation verification — 2026-11-15

Implementation checkpoint: `85bc445` (follow-up adds a current-main check and documentation).

- Local: 137 JavaScript tests and 40 Python companion tests passed. Production packaging and MV3 audit passed.
- Hosted: [first workflow run](https://github.com/dragod812/study-keys/actions/runs/43765725174) passed on Ubuntu with Node 24 / Python 3.13, including clean dependency installation, tests, version stamping, production packaging and artifact upload.
- Publisher ID verified in Web Store Publisher Settings. Repository variable installed.
- Store observed in Chrome: published 1.7.1, submitted 1.7.2 pending review, new-package upload disabled. No cancellation control exposed.
- Publishing identity not yet linked at this checkpoint: Google Cloud SDK consent awaits user confirmation. Hosted run explicitly warned and skipped authentication/submission. A successful build is not a successful store release.
- Independent agent review was not available under the session's delegation constraints. State-machine regression tests cover pending/staged review preservation, already-published versions, blocked/rejected items, async upload processing, failed upload preventing submission, and automatic-publication submission payload.

## Google identity setup

Created dedicated project `study-keys-release-1414018037` (number `99823398318`), enabled required APIs, and created `study-keys-publisher@study-keys-release-1414018037.iam.gserviceaccount.com` without project resource roles or service-account keys.

Provider: `projects/99823398318/locations/global/workloadIdentityPools/github/providers/github-main`. Conditions require repository ID `1414018037`, owner ID `21700561`, ref `refs/heads/main`, and exclude pull-request events. Only this repository principal set has `roles/iam.workloadIdentityUser` on the publisher account. All three GitHub configuration variables are installed.

Google's predefined pool admin role did not grant the legacy permission required by the create API. A temporary custom setup role supplied only pool/provider creation/read permissions; both temporary setup bindings were removed afterward. The service account received no project IAM roles.

First authenticated hosted attempt reached token minting but returned IAM 403; retrying after IAM propagation. Publisher service-account linking is separately prepared in Chrome and awaits action-time confirmation.

The rerun's Google authentication step succeeded, proving GitHub → Google federation and service-account token minting. The Web Store status request then returned HTTP 403 while the service account remained unlinked in Publisher Settings. This is the remaining access gate, not a build/test failure. See [authenticated run](https://github.com/dragod812/study-keys/actions/runs/43766283764).

## End-to-end access verified

The user approved linking the service account. Chrome showed “Service account added”; after Save changes and a full reload, the publisher settings still listed the exact account.

[Release run 43766856224](https://github.com/dragod812/study-keys/actions/runs/43766856224) passed all 137 JavaScript tests, 40 native tests, production packaging/MV3 audit, Google keyless authentication and the Web Store API request. Its log reported `Chrome Web Store 1.7.4.35: deferred.` Google is still processing the existing 1.7.2 review; no newer package was uploaded or submitted by this run. Automatic publishing is now configured: hourly runs retry the latest main commit without cancelling an active review. Future main pushes receive the same tested release path and monotonically versioned packages.
