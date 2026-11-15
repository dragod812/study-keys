# Release automation verification — 2026-11-15

Implementation checkpoint: `85bc445` (follow-up adds a current-main check and documentation).

- Local: 137 JavaScript tests and 40 Python companion tests passed. Production packaging and MV3 audit passed.
- Hosted: [first workflow run](https://github.com/dragod812/study-keys/actions/runs/43765725174) passed on Ubuntu with Node 24 / Python 3.13, including clean dependency installation, tests, version stamping, production packaging and artifact upload.
- Publisher ID verified in Web Store Publisher Settings. Repository variable installed.
- Store observed in Chrome: published 1.7.1, submitted 1.7.2 pending review, new-package upload disabled. No cancellation control exposed.
- Publishing identity not yet linked at this checkpoint: Google Cloud SDK consent awaits user confirmation. Hosted run explicitly warned and skipped authentication/submission. A successful build is not a successful store release.
- Independent agent review was not available under the session's delegation constraints. State-machine regression tests cover pending/staged review preservation, already-published versions, blocked/rejected items, async upload processing, failed upload preventing submission, and automatic-publication submission payload.
