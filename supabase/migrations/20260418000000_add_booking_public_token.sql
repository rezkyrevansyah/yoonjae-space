-- Add public_token for secure public page URLs (IDOR fix)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT gen_random_uuid() NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_public_token_idx ON bookings (public_token);
