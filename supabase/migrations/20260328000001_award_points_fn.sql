-- Helper function so server routes can atomically insert a point_event
-- AND increment the profile balance in one call.
-- SECURITY DEFINER so it can update any profile row regardless of RLS.
CREATE OR REPLACE FUNCTION award_points(
  p_user_id      uuid,
  p_amount       integer,
  p_reason       text,
  p_reference_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO point_events (user_id, amount, reason, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_reference_id);

  UPDATE profiles
  SET    points = GREATEST(0, points + p_amount)
  WHERE  id = p_user_id;
END;
$$;
