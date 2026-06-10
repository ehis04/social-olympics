# ADR 001 — Turborepo Monorepo

## Status: Accepted

## Context
The platform requires a web app (Next.js) and a mobile app (React Native/Expo) that share a significant amount of logic: TypeScript types, validation schemas, scoring algorithms, Supabase queries, and UI tokens. Managing these as separate repositories would create duplication and version drift.

## Decision
Use a Turborepo monorepo with pnpm workspaces, organising shared logic into `packages/*` and applications into `apps/*`.

## Rationale
- Turborepo provides task caching and incremental builds across packages, making CI fast even as the codebase grows.
- pnpm workspaces give strict dependency isolation without the phantom dependency issues of npm/yarn hoisting.
- A monorepo ensures shared packages (types, constants, scoring) are always in sync — no cross-repo version management.
- Turborepo's `pipeline` config enforces correct build order: packages build before apps.

## Consequences
- All developers work in a single repository, which simplifies onboarding and PR review.
- CI runs typecheck and lint across all packages on every PR — any breaking change is caught immediately.
- pnpm must be used consistently; npm or yarn commands will not respect the workspace config.
