## About

Newari for “Are you okay?”, Mha Phu La (म्ह फु ला?) is a mental health social app that helps people find support, connect with others nearby, and meet up in real life. Users share posts, join events, plan outings together, and unlock discount rewards when they check in at the same spot.

Built for NLN 2026 hackathon.

---

## Team

| Name | Role | LinkedIn |
|------|------|----------|
| Aayam Raj Shakya | Full-stack | [in/aayamrajshakya](https://linkedin.com/in/aayamrajshakya/) |
| Yuv Raj Pant | Architecture design & Project management | [in/yuvrajpant56](https://linkedin.com/in/yuvrajpant56/) |
| Deepankha Bajracharya | Back-end | [in/deepankha-bajracharya](https://linkedin.com/in/deepankha-bajracharya/) |
| Ashriya Tuladhar | Front-end | [in/ashriya-tuladhar](https://linkedin.com/in/ashriya-tuladhar/) |
| Rashmi Kaspal | Front-end | [in/rashmi-kaspal-934591242](https://linkedin.com/in/rashmi-kaspal-934591242/) |

---

## What it does

### Feed
A social feed where users share how they're feeling. Posts have mood tags (happy, anxious, low, etc.) and show up from friends and suggested users. You can like posts and see who's posting what.

### Connect
Find and connect with other users. Send connection requests, accept/decline them, and build your friend list. The app matches you based on your vibe preferences from onboarding.

### Events
Browse mental health events near you — therapy meetups, support circles, outdoor walks, and more. Events are ranked by how relevant they are to your current mood based on your recent posts. Powered by WebLLM for personalized explanations.

### Messages
Real-time direct messaging with your friends (used Supabase)

### Map
See events and people near you on an interactive map. Helps you find what's happening in your area.

### Rewards & Outings
Plan outings with friends and earn points when you check in together at the same spot. Points unlock discounts and rewards. There's a contribution tier system based on how active you are (posts, completed outings, reflections).

### Profile
Set up your profile with your name, age, bio, gender, location, and vibe preferences (energetic or quiet events). Age must be 18+.

---

## Stack

- Next.js
- Supabase for database stuffs
- Tailwind CSS
- Leaflet for interactive map
- FakerJS for dummy event data
- WebLLM: runs Llama 3.2 1B Instruct fully in the browser via WebGPU, no server calls. Used for event tag extraction, personalised recommendation explanations, and a lightweight content moderation pre-filter

---

## Getting started

> [!IMPORTANT]
> Create a Supabase account

---

### 1. Clone and install

```bash
git clone https://github.com/aayamrajshakya/mha-phu-la.git
cd mha-phu-la
npm install
```

---

### 2. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New project**
2. Give it a name, set a database password, pick a region, and wait ~2 minutes for it to spin up
3. Once ready, go to **Project Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon / public** key
   - **service_role** secret key (click the eye icon to reveal it)

---

### 3. Create `.env.local`

Create a file called `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_DB_URL=postgresql://postgres:<your-db-password>@db.<your-project-ref>.supabase.co:5432/postgres
```

- The anon key goes in both `ANON_KEY` and `PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_DB_URL`: find it in **Project Settings → Database → Connection string → URI**. Replace `<your-db-password>` with the password you set when creating the project.

---

### 4. Set up the database and seed

This runs the schema, all migrations, and seeds demo data in one go:

```bash
npm run setup
```

Or if you only want the database schema without seeding:

```bash
npm run db:setup
```

> The script connects to your Supabase Postgres database directly via `SUPABASE_DB_URL` and runs all SQL files in the correct order automatically.

---

### 5. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000.

---

## Demo accounts

Created by `npm run setup`. Log in with any of these:

| Email | Password |
|-------|----------|
| aayam@mhaphula.com | Boston123! |
| ashriya@mhaphula.com | Boston123! |
| yuvraj@mhaphula.com | Boston123! |
| deepankha@mhaphula.com | Boston123! |
| rashmi@mhaphula.com | Boston123! |


---

> [!NOTE]  
> WebLLM uses WebGPU to run models in the browser; the first load may be slow because it downloads a ~600MB model.
