# ADR 002 — Supabase Over Firebase

## Status: Accepted

## Context
The platform needs a managed backend that provides: relational database with complex queries (leaderboards, scoring, tiebreakers), authentication, realtime subscriptions (live leaderboard updates), file storage (avatars), and serverless functions (scoring calculation, notifications).

## Decision
Use Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) as the sole backend.

## Rationale
- PostgreSQL gives full relational power: JOINs, window functions (for leaderboard ranking), check constraints (age gate, numeric limits), and row-level security.
- Firebase's Firestore is a document database — implementing the scoring and tiebreaker logic with correct consistency would require significant application-side workarounds.
- Supabase Auth integrates natively with Row Level Security, meaning access control is enforced at the database layer.
- Supabase Realtime uses PostgreSQL logical replication — the leaderboard can subscribe to `results` table changes without polling.
- Supabase has a generous free tier and a local Docker development environment, keeping costs zero during development.
- TypeScript type generation from the schema eliminates a class of runtime errors.

## Consequences
- The team must understand PostgreSQL and RLS — there is no abstraction layer hiding the database.
- Edge Functions run on Deno, not Node.js — some npm packages are unavailable. Pure TypeScript logic is used instead.
- Local development requires Docker to be running.
