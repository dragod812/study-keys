# Automated Chrome Web Store releases

Every main push runs JavaScript tests, Python companion tests, the production build and the packaged MV3 remote-code audit. Pull requests run the same checks without authenticating to Google. The tested ZIPs are retained as GitHub Actions artifacts.

The package version is `<manifest major.minor.patch>.<reachable commit count>` using full Git history. Source `1.7.4` becomes e.g. `1.7.4.33`. `version_name` remains `1.7.4`. A scheduled retry uses the same version for the same commit. Keep main history forward-only; bump the three-part base version before exhausting 65535 commits or changing history. CI stamps the workspace only; local development versions are unchanged.

After checks, main authenticates through Google Workload Identity Federation and submits with `DEFAULT_PUBLISH`: Google review still applies and publication happens on approval. There are no stored service-account keys or OAuth refresh tokens. A pending or staged review is preserved, and the hourly scheduled run retries the latest main revision after it clears. Rejected submissions and taken-down items fail visibly for manual investigation. CI does not cancel reviews, change the listing, or grant permissions.

## One-time identity setup

1. Use a dedicated Google Cloud project with Chrome Web Store API (`chromewebstore.googleapis.com`), IAM Credentials, STS and IAM APIs enabled. Create `study-keys-publisher` service account without project-level roles.
2. Create an OIDC workload identity pool/provider with issuer `https://token.actions.githubusercontent.com`, mapping `google.subject=assertion.sub` and repository/ref claims. Restrict the provider to repository ID `1414018037`, owner ID `21700561` and `refs/heads/main` (all three conditions). Bind only this repository's principal set to the service account with `roles/iam.workloadIdentityUser`.
3. Link that service account in Chrome Web Store **Publisher → Settings → Service account**. This grants API access to all items in this publisher; the publisher currently contains Study Keys only. This access grant requires explicit confirmation when performed through computer use.
4. Set GitHub repository Actions variables:
   - `CWS_PUBLISHER_ID`: `4efa0346-7743-450d-9573-8e3bd43eeb42` (verified in dashboard).
   - `CWS_WORKLOAD_IDENTITY_PROVIDER`: full `projects/NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER` resource name.
   - `CWS_SERVICE_ACCOUNT`: linked service-account email.
5. Run **Actions → Test and release → Run workflow**. Confirm the summary says submitted/published, or deferred while an older review is pending. Missing identity configuration produces an explicit warning and no publishing attempt.

Use GitHub Actions logs and the developer dashboard to distinguish **tested**, **uploaded**, **submitted** and **published**. A green build without publishing identity is not a marketplace deployment.

Disable automatic publishing by removing `CWS_WORKLOAD_IDENTITY_PROVIDER`; revoke access by unlinking the service account and removing its workload identity binding. Existing published releases stay available.

Official references: [Web Store API](https://developer.chrome.com/docs/webstore/using-api), [service accounts](https://developer.chrome.com/docs/webstore/service-accounts), [Google GitHub authentication](https://github.com/google-github-actions/auth).
