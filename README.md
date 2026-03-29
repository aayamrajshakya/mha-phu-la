# Mha Phu La?

A mental health social app that helps people find support, connect with others nearby, and meet up in real life. Users share posts, join events, plan outings together, and unlock discount rewards when they check in at the same spot.

Built for NLN 2026 hackathon.

## Stack

- Next.js
- Supabase for database stuffs
- Tailwind CSS
- Leaflet for interactive map
- FakerJS for dummy event data
- WebLLM: runs Llama 3.2 1B Instruct fully in the browser via WebGPU, no server calls. Used for event tag extraction, personalised recommendation explanations, and a lightweight content moderation pre-filter

## Getting started

The repo includes a `secrets.txt` file with the real credentials already filled in. Just rename it:

```bash
mv secrets.txt .env.local
```

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000 and you should be good to go.
