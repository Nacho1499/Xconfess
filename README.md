# xConfess

xConfess is a monorepo for an anonymous confession platform built with NestJS, Next.js 16, PostgreSQL, Redis-backed queues, WebSockets, and Soroban smart contracts on Stellar.

## Repository Layout

- `xconfess-backend`: API, auth, moderation, notifications, data export, and Stellar integration
- `xconfess-frontend`: App Router UI, cookie-backed auth/session handling, proxy routes, and admin surfaces
- `xconfess-contracts`: Soroban Rust workspace for confession anchoring, tipping, and reputation-related contracts
- `compose.yaml`: local Postgres and Redis stack for development

## What This Repo Does Today

- anonymous confession feed and composer
- reactions, comments, and private messaging
- admin moderation, reports, analytics, and user management
- privacy settings, notifications, and profile flows
- Stellar anchoring, tipping, and contract invocation tooling
- audit logging and data export

## Reality Check

- The frontend does not use NextAuth.
- Auth is cookie/session based, with a dev-only bypass flag: `NEXT_PUBLIC_DEV_BYPASS_AUTH=true`.
- The frontend talks to the backend through App Router proxy routes and `credentials: "include"`.
- Redis is required for queue-backed features such as notifications and export jobs.
- Some export and Stellar workflows are still being hardened; see the open issues for the current backlog.

## Local Development

1. Install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Start PostgreSQL and Redis, for example:

   ```bash
   docker compose -f compose.yaml up -d
   ```

3. Configure `xconfess-backend/.env` and `xconfess-frontend/.env.local`.
4. Run the app:

   ```bash
   npm run dev
   ```

Default local ports:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Useful Scripts

- `npm run backend:build`
- `npm run backend:test`
- `npm run frontend:build`
- `npm run frontend:test`
- `npm run contract:test`
- `npm run ci`

## Contributing

xConfess participates in Stellar Wave. Check the open issues for work tagged `Stellar Wave`, then coordinate before opening a PR.

## Package Docs

- `xconfess-backend/README.md`
- `xconfess-frontend/README.md`
- `xconfess-contracts/README.md`
