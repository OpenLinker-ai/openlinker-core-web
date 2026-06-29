# Contributing to OpenLinker Core Web

OpenLinker Core Web is the open-source frontend for `openlinker-core`. Keep it
limited to Core-owned APIs and self-hosted workflows.

## Setup

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

## Boundary Rules

- Do not add wallet, Stripe, withdrawals, pricing, finance admin, or cloud-only
  dashboard surfaces.
- Prefer Core API routes through `/api/v1/*`.
- Keep examples and docs free of real tokens, private URLs, and local `.env`
  values.
- Follow the local Next.js version docs before changing framework-specific
  behavior.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

