# Contributing to OpenLinker Core Web

Chinese documentation: [CONTRIBUTING.zh-CN.md](./CONTRIBUTING.zh-CN.md)

Thanks for helping improve OpenLinker Core Web. This repository is the
open-source frontend for self-hosted OpenLinker Core deployments.

## Development Setup

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Run a compatible `openlinker-core` API locally or point `CORE_API_URL` /
`API_URL` at a test Core deployment.

## Scope Boundaries

Allowed here:

- Core Registry, Agent detail, Playground, task, workflow, A2A, MCP/connect,
  settings, inbox, creator, status, and local admin UI
- User Token contract, local management UI, and scoped API/MCP guidance
- API proxy behavior for Core-owned endpoints under `/api/v1/*`
- UI copy, accessibility, and localization for open-source Core workflows

Out of scope:

- wallet, Stripe, withdrawals, pricing, finance admin, and hosted billing
- managed account/token-policy dashboards and other Hosted-only product surfaces
- private marketplace ranking or recommendation controls

## Pull Request Expectations

- Follow existing Next.js App Router and component patterns.
- Keep server-side Core calls behind existing API helpers or proxy conventions.
- Use existing UI primitives before adding new ones.
- Keep text localized when touching pages that already use i18n.
- Include screenshots for visible UI changes when practical.
- Redact tokens, private URLs, customer data, and `.env.local` values.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run test:a2a-session
```

If a check requires a running Core API, state the API URL and any skipped
credentials-dependent flows in the PR.

## Security

Pay special attention to session handling, protected routes, the API proxy,
token display/copy flows, user-controlled URLs, and callback surfaces. Do not
open public vulnerability issues; follow [SECURITY.md](./SECURITY.md).

## License

By contributing, you agree that your contribution is licensed under the
Apache-2.0 license used by this repository.
