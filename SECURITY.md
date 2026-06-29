# Security Policy

Do not open public issues for vulnerabilities.

Use GitHub private vulnerability reporting when available. Otherwise contact
the maintainers through the published OpenLinker security/support channel with
the affected commit, reproducible steps, impact, and whether a live token or
service is involved.

Security-sensitive areas include:

- session handling and protected routes
- API proxy behavior
- access-token display and copy flows
- user-controlled URLs and callback surfaces
- local HTTP endpoint warnings

Never include real third-party secrets in public reports or test cases.

