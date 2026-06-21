# OpenLinker Core Web

`openlinker-core-web` is the standalone Next.js frontend for `openlinker-core`.
It is intended to live with an open-source core distribution and only calls
core-owned APIs.

## Scope

Included:

- Market, Agent detail, Playground, task, workflow, A2A, MCP/connect, status
- Auth, personal workspace, run history, run detail, inbox, settings
- Creator Hub for Agent onboarding, runtime pull, approvals, Registry, Skill claims
- API proxy to `openlinker-core` through `/api/v1/*`

Excluded:

- Wallet, charges, Stripe, withdrawals, commercial plans
- Commercial API key management and product dashboards
- Admin finance workflows

`openlinker-web` remains the commercial product frontend. This package is the core
frontend boundary.

## Stack

- Next.js 16 App Router + React 19
- TypeScript
- Tailwind CSS 4
- NextAuth v5
- TanStack Query
- React Hook Form + Zod
- lucide-react
- sonner

## Quick Start

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Default local endpoints:

- Core API: `http://localhost:8080`
- Core Web: `http://localhost:3000`

`NEXTAUTH_SECRET` must match `JWT_SECRET` used by `openlinker-core`.

## Environment

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
API_URL=http://localhost:8080
CORE_API_URL=http://localhost:8080
NEXTAUTH_SECRET=replace-me-with-32-chars-random-secret
NEXTAUTH_URL=http://localhost:3000
```

`NEXT_PUBLIC_API_URL` should normally point to the web origin so browser calls
use the local Next.js `/api/v1/*` proxy. Server components use `CORE_API_URL`
or `API_URL` to reach core directly.

## Common Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npx tsc --noEmit
```

## Docker

Build from the repository root:

```bash
docker build -f openlinker-core-web/Dockerfile.server -t openlinker-core-web .
```

The container expects `API_URL` or `CORE_API_URL` to point at the core API.

## Directory Notes

```text
openlinker-core-web/
├── proxy.ts
├── Dockerfile.server
├── src/app/
│   ├── page.tsx
│   ├── runs/
│   ├── my/
│   ├── settings/
│   ├── (creator)/hub/
│   ├── (creator)/publish/
│   ├── registry/
│   └── api/v1/[...path]/route.ts
├── src/components/
└── src/lib/api-root.ts
```

Do not add commercial product flows to this package. Add those to
`openlinker-web`.
