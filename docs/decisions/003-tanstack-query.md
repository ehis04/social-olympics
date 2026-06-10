# ADR 003 — TanStack Query for Server State

## Status: Accepted

## Context
The application fetches server data frequently: competition lists, leaderboards, event results, member lists, messages. These all require caching, background refetching, optimistic updates, and loading/error state management.

## Decision
Use TanStack Query (React Query) for all server state management across web and mobile.

## Rationale
- TanStack Query provides a mature, well-documented caching layer that eliminates manual loading/error state boilerplate.
- Query invalidation (e.g. after submitting a result, invalidate the leaderboard query) is declarative and predictable.
- Optimistic updates can be applied for UX-critical actions (reaction, message send) with automatic rollback on error.
- The same library runs on both web (React) and mobile (React Native) — no duplication of data-fetching patterns.
- It pairs naturally with Supabase: queries use the Supabase client, realtime subscriptions can trigger query invalidation.

## Consequences
- Server state (fetched data) lives in TanStack Query's cache. Client-only state (UI state, form state) lives in Zustand or React component state.
- Developers must understand the distinction between server state and client state to use both libraries correctly.
