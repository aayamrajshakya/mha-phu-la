-- ========================
-- REWARD POINTS SYSTEM
-- ========================

-- Add gender column (may already exist from dashboard)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text;

-- Points balance on the user's profile
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS points integer NOT NULL DEFAULT 0;

-- Append-only log of every points transaction
CREATE TABLE IF NOT EXISTS point_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount      integer     NOT NULL,
  reason      text        NOT NULL CHECK (reason IN (
                            'outing_complete',
                            'post_created',
                            'event_registered',
                            'reflection_completed'
                          )),
  reference_id text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE point_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own point events"
  ON point_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users insert their own events (post_created, event_registered, reflection_completed)
CREATE POLICY "Users can insert own point events"
  ON point_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Security-definer function: validates the check-in code,
-- marks the outing complete, and awards 50 pts to BOTH users.
-- Called by the partner (verifier) after code entry.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION complete_outing_and_award_points(
  p_outing_id      uuid,
  p_submitted_code text,
  p_reward_code    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creator_id  uuid;
  v_partner_id  uuid;
  v_status      text;
  v_stored_code text;
  v_expires_at  timestamptz;
BEGIN
  SELECT creator_id, partner_id, status, checkin_code, checkin_code_expires_at
  INTO   v_creator_id, v_partner_id, v_status, v_stored_code, v_expires_at
  FROM   outings
  WHERE  id = p_outing_id;

  IF NOT FOUND                          THEN RAISE EXCEPTION 'Outing not found';              END IF;
  IF auth.uid() != v_partner_id         THEN RAISE EXCEPTION 'Only the partner can verify';   END IF;
  IF v_status   != 'pending'            THEN RAISE EXCEPTION 'Outing already completed';       END IF;
  IF v_stored_code IS NULL              THEN RAISE EXCEPTION 'No code generated yet';          END IF;
  IF v_stored_code != p_submitted_code  THEN RAISE EXCEPTION 'Invalid code';                   END IF;
  IF v_expires_at  < now()              THEN RAISE EXCEPTION 'Code expired';                   END IF;

  -- Mark complete; repurpose checkin_code to hold the reward code
  UPDATE outings
  SET    status            = 'completed',
         reward_unlocked_at = now(),
         checkin_code       = p_reward_code
  WHERE  id = p_outing_id;

  -- Award 50 pts to the outing creator
  INSERT INTO point_events (user_id, amount, reason, reference_id)
  VALUES (v_creator_id, 50, 'outing_complete', p_outing_id::text);
  UPDATE profiles SET points = GREATEST(0, points + 50) WHERE id = v_creator_id;

  -- Award 50 pts to the verifying partner
  INSERT INTO point_events (user_id, amount, reason, reference_id)
  VALUES (v_partner_id, 50, 'outing_complete', p_outing_id::text);
  UPDATE profiles SET points = GREATEST(0, points + 50) WHERE id = v_partner_id;
END;
$$;
