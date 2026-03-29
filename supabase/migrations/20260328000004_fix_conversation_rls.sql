-- Fix self-referential RLS on conversation_members.
-- The original "Members can view conversation_members" policy used EXISTS on conversation_members
-- inside a conversation_members policy, causing a recursive evaluation.
-- PostgREST/Supabase sometimes resolves this to empty results, breaking message sends.
-- Solution: security-definer helper that queries conversation_members without RLS,
-- then use it in all dependent policies.

CREATE OR REPLACE FUNCTION is_conversation_member(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- conversation_members: replace self-referential policy
DROP POLICY IF EXISTS "Members can view conversation_members" ON conversation_members;
CREATE POLICY "Members can view conversation_members" ON conversation_members
  FOR SELECT USING (is_conversation_member(conversation_id));

-- conversations: replace self-referential policy
DROP POLICY IF EXISTS "Members can view conversations" ON conversations;
CREATE POLICY "Members can view conversations" ON conversations
  FOR SELECT USING (is_conversation_member(id));

-- messages: replace self-referential policies
DROP POLICY IF EXISTS "Members can view messages" ON messages;
CREATE POLICY "Members can view messages" ON messages
  FOR SELECT USING (is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Members can send messages" ON messages;
CREATE POLICY "Members can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND is_conversation_member(conversation_id)
  );

-- connections: add missing DELETE policy so decline/unfriend actually works
DROP POLICY IF EXISTS "Users can delete connections" ON connections;
CREATE POLICY "Users can delete connections" ON connections
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
