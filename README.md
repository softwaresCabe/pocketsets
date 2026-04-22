# PocketSets

A festival companion app for EDC Las Vegas 2026. Browse the full schedule, save your favorite sets, get notified before they start, and explore stages and artists — all from your phone or browser.

## Features

- **Now** — live view of what's playing right now across all stages
- **Schedule** — full grid schedule filterable by day (Fri / Sat / Sun) with auto-scroll to current time
- **My Sets** — save favorites and configure per-set notification lead times
- **Stages** — browse stages with genre focus and color coding
- **Lineup** — full artist roster with bios, genres, and music links
- **Map** — festival grounds map
- **Announcements** — real-time alerts and updates
- **Set Detail** — conflict detection between saved sets, custom notification timing, and contextual back navigation

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Wouter, TanStack React Query |
| UI | Tailwind CSS, Radix UI, shadcn/ui, Framer Motion |
| Backend | Express 5, SQLite, Drizzle ORM |
| Mobile | Capacitor (iOS + Android), Local Notifications |
| Build | Vite, TypeScript, ESBuild |

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install & Run

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5000`.

### Build

```bash
npm run build
npm start
```

### Database

The app uses a local SQLite database (`pocketsets.db`). To push schema changes:

```bash
npm run db:push
```

Seed data is in `server/seed.ts`.

## Mobile (iOS / Android)

The app is wrapped with Capacitor for native mobile distribution.

```bash
# Sync web build to native projects
npx cap sync

# Open in Xcode / Android Studio
npx cap open ios
npx cap open android
```

App ID: `com.pocketsets.app`

## Project Structure

```
client/src/
  pages/        # Route-level page components
  components/   # Shared UI components (SetCard, AppShell, etc.)
  lib/          # API hooks, mutations, utilities
server/
  index.ts      # Express entry point
  routes.ts     # API routes
  storage.ts    # DB access layer
  seed.ts       # Festival data seeding
shared/
  schema.ts     # Drizzle schema + Zod types (shared client/server)
```

## License

MIT
