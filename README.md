## About

Newari for “Are you okay?”, Mha Phu La (म्ह फु ला?) is a mental health social app that helps people find support, connect with others nearby, and meet up in real life. Users share posts, join events, plan outings together, and unlock discount rewards when they check in at the same spot.

Built for NLN 2026 hackathon by Aayam, Ashriya, Yuvraj, Deepankha & Rashmi.

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

The repo includes a `xyz.txt` file with the real credentials already filled in. Just rename it:

```bash
mv xyz.txt .env.local
```

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000 and you should be good to go.

---

## Demo accounts:
Emails: {aayam, ashriya, yuvraj, deepankha, rashmi}@mhaphula.com  
Password for all: Boston123!


---

> [!NOTE]  
> WebLLM uses WebGPU to run models in the browser; the first load may be slow because it downloads a ~600MB model.
