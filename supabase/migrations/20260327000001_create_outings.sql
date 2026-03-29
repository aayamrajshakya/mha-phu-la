-- ========================
-- OUTINGS TABLE
-- ========================
-- Tracks planned in-person meetups between two users.
-- Check-in flow: creator generates a 6-digit code → partner submits it
-- → complete_outing_and_award_points() awards 50 pts to both users.

CREATE TABLE IF NOT EXISTS outings (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id             uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id             uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                   text        NOT NULL CHECK (type IN ('coffee', 'movies', 'food', 'walk')),
  status                 text        NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'completed', 'cancelled')),
  -- Populated by /api/outings/[id]/checkin (creator only, expires after 10 min)
  checkin_code           text,
  checkin_code_expires_at timestamptz,
  -- Populated on completion: holds the redeemable reward code
  reward_unlocked_at     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- Indexes for the common query patterns
CREATE INDEX IF NOT EXISTS outings_creator_id_idx ON outings(creator_id);
CREATE INDEX IF NOT EXISTS outings_partner_id_idx ON outings(partner_id);

ALTER TABLE outings ENABLE ROW LEVEL SECURITY;

-- Users can see outings they created or are partnered in
CREATE POLICY "Users see own outings"
  ON outings FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = partner_id);

-- Only the creator can create an outing
CREATE POLICY "Creator can insert outings"
  ON outings FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Creator and partner can update (checkin code, status changes via API)
CREATE POLICY "Participants can update outings"
  ON outings FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = partner_id);
