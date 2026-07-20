# Watch Party

A production-ready synchronized watch party platform built with Next.js 15, Socket.io, Prisma, and Google APIs.

## Features

- **Google OAuth** — Sign in with Google, scoped for Drive & YouTube
- **YouTube Player** — Paste any YouTube URL to watch together
- **Google Drive Videos** — Browse and play your Drive videos
- **Real-time Sync** — Play/Pause/Seek syncs across all viewers with <300ms drift
- **Live Chat** — Real-time messaging with typing indicators
- **Room Management** — Host controls playback; transferable host ownership
- **Latency Compensation** — Auto-resync every 5s, auto-seek on >500ms drift
- **Responsive UI** — Desktop sidebar, mobile bottom-sheet chat

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Zustand |
| Backend | Node.js, Express, Socket.io, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth v4 + Google OAuth 2.0 |
| Monorepo | Turborepo + pnpm workspaces |
| Deploy | Vercel (web) + Railway (server) + Docker |

---

## Project Structure

```
watch-party/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   └── server/       # Express + Socket.io backend
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── database/     # Prisma schema & client
├── docker/           # Dockerfiles
├── docker-compose.yml
└── .env.example
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL (or use Docker)
- Google Cloud project with OAuth credentials

### 1. Clone & install

```bash
git clone <repo>
cd watch-party
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your Google credentials and secrets
```

### 3. Set up database

```bash
cd packages/database
pnpm prisma migrate dev
pnpm prisma generate
```

### 4. Start development

```bash
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000

---

## Docker (Production)

```bash
cp .env.example .env
# Edit .env with real secrets

docker compose up --build
```

---

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Drive API**, **YouTube Data API v3**, **People API**
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID & Secret to `.env`

### Required OAuth Scopes
```
openid
email
profile
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/youtube.readonly
```

---

## Deployment

### Frontend → Vercel

```bash
vercel --cwd apps/web
```

Set environment variables in Vercel dashboard.

### Backend → Railway

Push the repo to GitHub, connect to Railway, select `apps/server`, set env vars.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `ENCRYPTION_KEY` | Key for encrypting refresh tokens |
| `NEXTAUTH_SECRET` | NextAuth session secret |
| `NEXTAUTH_URL` | Public URL of the frontend |
| `NEXT_PUBLIC_SERVER_URL` | Public URL of the backend |

---

## Real-time Sync Architecture

- **Host is source of truth** — only host can play/pause/seek
- Clients send heartbeats every **5 seconds** with current time
- Server broadcasts `sync_state` to all clients
- If drift > **300ms**, soft correction applied
- If drift > **500ms**, hard seek forced
- Clock drift compensation via latency measurement

---

## License

MIT
