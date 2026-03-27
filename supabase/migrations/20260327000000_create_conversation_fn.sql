create or replace function create_conversation(partner_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  conv_id uuid;
begin
  select cm1.conversation_id into conv_id
  from conversation_members cm1
  join conversation_members cm2
    on cm1.conversation_id = cm2.conversation_id
  where cm1.user_id = auth.uid()
    and cm2.user_id = partner_id
  limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  insert into conversations default values returning id into conv_id;
  insert into conversation_members (conversation_id, user_id) values (conv_id, auth.uid());
  insert into conversation_members (conversation_id, user_id) values (conv_id, partner_id);

  return conv_id;
end;
$$;
