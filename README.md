# Kart Connect

A full-stack karting setup management app. Log, compare, and retrieve chassis setup data across sessions and circuits. When you return to a track, load your last setup as a baseline — not starting from scratch.

## Stack

- React 18 + Vite + TypeScript
- Supabase (Postgres + Auth + RLS)
- Tailwind CSS v3
- React Router v6
- Recharts
- Lucide React

## Prerequisites

- Node 18+
- npm 9+
- A Supabase project (free tier works)

## Setup

### 1. Clone and install

```bash
git clone <repo-url> kart-connect
cd kart-connect
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **Anon (public) key** from **Settings → API**.

### 3. Configure environment variables

Edit `.env.local` with your credentials:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

For the seed script, also add the **Service Role** key (keep this secret — never commit it):

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4. Apply the database migration

**Option A — Supabase SQL Editor (easiest)**

1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Paste the contents of `supabase/migrations/001_initial_schema.sql` and run it.

**Option B — Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_ID
npx supabase db push
```

### 5. Enable email auth

In your Supabase dashboard: **Authentication → Providers → Email** — ensure it is enabled.  
For local dev, optionally disable "Confirm email" under **Authentication → Email Templates**.

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Register an account and start logging sessions.

## Seed Data (optional)

Loads 3 tracks, 2 karts, and 5 realistic sessions (setups + lap times):

```bash
npx tsx seed.ts
```

Login with: `seed@kartconnect.dev` / `seedpass123!`

> The seed script uses the Service Role key, which bypasses RLS. Never expose it in frontend code.

## Project Structure

```
src/
├── components/
│   ├── ui/             # Button, Input, Select, SegmentedControl, Toggle, Badge, Card, Modal, Tabs
│   ├── forms/
│   │   ├── SetupForm/  # 5-tab setup form + context
│   │   └── LapEntry/   # Lap time input with MM:SS.mmm parsing
│   ├── layout/         # Sidebar, BottomTabBar, TopBar, PageWrapper
│   └── charts/         # LapProgressChart, ParameterCorrelationChart
├── pages/
│   ├── Dashboard.tsx
│   ├── NewSession.tsx   # 7-step wizard with localStorage persistence
│   ├── SessionDetail.tsx
│   ├── Tracks.tsx
│   ├── Compare.tsx
│   ├── Garage.tsx
│   ├── Analytics.tsx
│   └── Settings.tsx
├── hooks/              # useSessions, useSetup, useKarts, useTracks, useLapTimes
├── lib/                # supabase.ts, formatters.ts, setupDefaults.ts
├── types/index.ts      # TypeScript interfaces matching DB schema
└── contexts/           # AuthContext
supabase/
└── migrations/
    └── 001_initial_schema.sql
seed.ts
```

## Key Features

- **Load Last Setup** — auto-populate the wizard from your best-performing previous setup at the selected track + kart
- **7-step wizard** — full session creation with localStorage auto-save (no data lost on connection drop)
- **Setup comparison** — side-by-side diff, differing fields highlighted
- **Lap time logger** — `MM:SS.mmm` format, stored as milliseconds, delta badges per lap
- **Mid-session change logger** — log parameter changes with lap delta result
- **Dark racing aesthetic** — electric yellow (#E8FF00) accents on near-black backgrounds
- **Mobile responsive** — bottom tab bar on mobile, accordion setup form

## Database Schema

| Table | Description |
|-------|-------------|
| `tracks` | Circuit library |
| `karts` | Driver's garage |
| `sessions` | Individual track sessions with weather conditions |
| `setups` | Full chassis setup snapshot (one per session) |
| `setup_changes` | Mid-session tweak log with lap time delta |
| `lap_times` | Individual lap times stored in milliseconds |

All tables have Row Level Security — users see only their own data.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✓ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✓ | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Seed only | Service role key for seed script |
