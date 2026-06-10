# ADR 005 — Zustand Over Redux for Client State

## Status: Accepted

## Context
The application has client-side state that is not server-derived: active competition context (which competition the user is currently viewing), UI preferences, notification badge counts, form draft state.

## Decision
Use Zustand for client-side global state management.

## Rationale
- Zustand has minimal boilerplate: a store is defined in a single `create()` call with no action creators, reducers, or dispatch patterns.
- The bundle size is tiny (~1KB) compared to Redux Toolkit.
- Zustand works identically in React and React Native — one pattern for both platforms.
- For this platform, client state is small and localised. The complexity of Redux (or even Context) is not justified.
- TanStack Query handles all server state, so Zustand only manages UI concerns — keeping stores small and focused.

## Consequences
- Global client state is split across several small Zustand stores by domain (auth, competition, notifications).
- Redux DevTools can still be used with the Zustand devtools middleware if debugging is needed.
- Developers must be disciplined about not putting server state into Zustand — that belongs in TanStack Query.
