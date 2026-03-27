# mha-fu

A social app that encourages people to meet up in real life. Users connect with friends, plan outings together, and unlock discount rewards when they check in at the same place.

Built for a hackathon.

## Stack

- Next.js 16
- Supabase (auth, database, storage)
- Tailwind CSS

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment variables

Create a `.env.local` file with your Supabase project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```