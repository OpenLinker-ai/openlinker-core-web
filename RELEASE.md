# Release Process

This repository is released from `main` after CI and local release gates pass.

Before tagging a release:

1. Confirm `README.md`, `CHANGELOG.md`, `SECURITY.md`, and examples are current.
2. Run `npm audit`.
3. Run `npm run lint`.
4. Run `npx tsc --noEmit`.
5. Run `npm run build`.
6. Run a current-source secret scan on a clean checkout with
   `gitleaks dir --redact .`.
7. Confirm `.env.local`, `.next`, `node_modules`, and build output are not
   tracked.

Document notable changes under the `Unreleased` section in `CHANGELOG.md`
until formal public versioning is introduced.
