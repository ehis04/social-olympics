# ADR 004 — Scoring as an Isolated Pure Package

## Status: Accepted

## Context
The scoring system is the most complex and critical business logic in the platform: points calculation, weighting multipliers, best-of-N selection, tiebreaker sequencing, team balance. Errors here directly affect competition integrity.

## Decision
All scoring logic lives in `packages/scoring` as pure TypeScript functions with no dependencies on UI, database, or network. It is 100% unit tested before any UI or API is built.

## Rationale
- Pure functions are trivially testable: given input X, output Y. No mocking of databases or HTTP calls.
- Isolating scoring from Supabase queries ensures the logic can be validated against the specification independently.
- The scoring package can be imported by both Edge Functions (server-side calculation) and the web/mobile apps (client-side display logic) without circular dependencies.
- A scoring bug found in unit tests is caught before it ever reaches production data.

## Consequences
- The scoring package has no side effects. It cannot write to the database. Writes happen in Edge Functions that call scoring functions.
- 100% unit test coverage is a hard requirement for this package before Phase 4 begins.
