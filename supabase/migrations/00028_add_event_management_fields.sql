/*
 * This migration updates the database for 00028 add event management fields.
 */

-- Migration 00028: host-editable event management details

ALTER TABLE public.competition_events
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS details text;
