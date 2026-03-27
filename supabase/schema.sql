-- Enable PostGIS for location queries (optional, requires extension)
-- create extension if not exists postgis;

-- ========================
-- PROFILES
-- ========================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  age integer,
  bio text,
  avatar_url text,
  address text,
  lat double precision,
  lng double precision,
  mood text,
  created_at timestamptz default now()
);

-- Auto-create profile row on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ========================
-- POSTS
-- ========================
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  image_url text,
  mood_tag text,
  created_at timestamptz default now()
);

-- ========================
-- POST LIKES
-- ========================
create table if not exists post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

-- ========================
-- CONNECTIONS
-- ========================
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique(requester_id, receiver_id)
);

-- ========================
-- CONVERSATIONS
-- ========================
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table if not exists conversation_members (
  conversation_id uuid references conversations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  primary key (conversation_id, user_id)
);

-- ========================
-- MESSAGES
-- ========================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- ========================
-- ROW LEVEL SECURITY
-- ========================

alter table profiles enable row level security;
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table connections enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "Profiles are viewable by all" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Posts: anyone can read, authenticated can insert, owner can delete
create policy "Posts are viewable by all" on posts for select using (true);
create policy "Authenticated users can post" on posts for insert with check (auth.uid() = user_id);
create policy "Users can delete own posts" on posts for delete using (auth.uid() = user_id);

-- Post likes
create policy "Anyone can view likes" on post_likes for select using (true);
create policy "Authenticated users can like" on post_likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike" on post_likes for delete using (auth.uid() = user_id);

-- Connections
create policy "Users can view their connections" on connections for select
  using (auth.uid() = requester_id or auth.uid() = receiver_id);
create policy "Users can send connection requests" on connections for insert
  with check (auth.uid() = requester_id);
create policy "Receiver can update connection" on connections for update
  using (auth.uid() = receiver_id);

-- Conversations: only members can access
create policy "Members can view conversations" on conversations for select
  using (
    exists (
      select 1 from conversation_members
      where conversation_id = conversations.id and user_id = auth.uid()
    )
  );
create policy "Authenticated users can create conversations" on conversations for insert
  with check (true);

-- Conversation members
create policy "Members can view conversation_members" on conversation_members for select
  using (
    exists (
      select 1 from conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id and cm.user_id = auth.uid()
    )
  );
create policy "Users can join conversations" on conversation_members for insert
  with check (auth.uid() = user_id);

-- Messages: only conversation members can read/write
create policy "Members can view messages" on messages for select
  using (
    exists (
      select 1 from conversation_members
      where conversation_id = messages.conversation_id and user_id = auth.uid()
    )
  );
create policy "Members can send messages" on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from conversation_members
      where conversation_id = messages.conversation_id and user_id = auth.uid()
    )
  );

-- ========================
-- STORAGE BUCKETS
-- ========================
-- Run these in the Supabase dashboard > Storage > New bucket:
-- 1. "avatars" — public bucket
-- 2. "posts" — public bucket

-- Or via SQL:
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "Users can upload avatars" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can update avatars" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Post images are publicly accessible" on storage.objects
  for select using (bucket_id = 'posts');
create policy "Users can upload post images" on storage.objects
  for insert with check (bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]);

-- ========================
-- REALTIME
-- ========================
-- Enable realtime on messages table in Supabase dashboard:
-- Database > Replication > Tables > enable "messages"
