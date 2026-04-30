-- ============================================================
-- Phase 2 (C3 + H4): Public MUA endpoint lockdown
--
-- Adds an explicit is_mua flag to addons and packages so the
-- /mua public schedule can filter in SQL (correct + indexable)
-- instead of string-matching the name in JS (fragile).
--
-- Migration is purely ADDITIVE — defaults to false, so existing
-- rows keep their current behavior until staff opts a row in
-- via Settings.
-- ============================================================

ALTER TABLE addons
  ADD COLUMN IF NOT EXISTS is_mua boolean NOT NULL DEFAULT false;

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS is_mua boolean NOT NULL DEFAULT false;

-- Backfill: any addon/package whose name contains "mua" (case-insensitive)
-- gets is_mua=true so the /mua page keeps showing the same slots after
-- the API switches to flag-based filtering.
UPDATE addons   SET is_mua = true WHERE lower(name) LIKE '%mua%' AND is_mua = false;
UPDATE packages SET is_mua = true WHERE lower(name) LIKE '%mua%' AND is_mua = false;

-- Partial indexes — small, only the rows the public endpoint cares about.
CREATE INDEX IF NOT EXISTS addons_is_mua_idx   ON addons   (id) WHERE is_mua = true;
CREATE INDEX IF NOT EXISTS packages_is_mua_idx ON packages (id) WHERE is_mua = true;
