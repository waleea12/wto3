# Personal server deployment

The Next.js frontend stays on Vercel (`wto3-web.vercel.app`). This Compose stack runs PostgreSQL, the Express/Socket.io server, and Caddy on the Ubuntu VPS.

1. Point `API_DOMAIN` in `.env` at a DNS name resolving to the VPS. The current configuration uses `wto3-api.84.13.157.157.sslip.io`.
2. Allow inbound TCP 80 and 443 in the cloud provider's Security List or NSG. Keep PostgreSQL and port 4000 private.
3. Copy `.env.example` to `.env`, generate independent random values for `DB_PASSWORD`, `JWT_SECRET`, and `ENCRYPTION_KEY`, and add Google OAuth credentials only if Google login is desired.
4. Run `docker compose -f deploy/vps/compose.yaml up -d --build` from the repository root. The server applies Prisma migrations before starting.
5. Verify `https://$API_DOMAIN/health` returns `{ "status": "ok" }` and confirm a valid TLS certificate.
6. Set Vercel production `NEXT_PUBLIC_SERVER_URL=https://$API_DOMAIN`, `NEXTAUTH_URL=https://wto3-web.vercel.app`, and a random `NEXTAUTH_SECRET`, then deploy the frontend. The backend CORS origin is restricted to `https://wto3-web.vercel.app`.
7. Add `TMDB_READ_ACCESS_TOKEN` to the Vercel project as a server-side environment variable. The room searches TMDB for movies and TV shows, then embeds CineSrc using the selected TMDB ID and season/episode.

Email and password registration works without Google credentials. To enable Google login later, set matching `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the VPS and Vercel environments, set `GOOGLE_AUTH_ENABLED=true` in Vercel, register the Vercel callback URL in Google OAuth, and redeploy both services.

Back up the PostgreSQL volume before server upgrades. Changing `JWT_SECRET` signs out existing server sessions; changing `NEXTAUTH_SECRET` signs out browser sessions. The fresh PostgreSQL volume contains no Railway accounts.

TMDB supplies catalog metadata only. CineSrc supplies the player, so actual title availability and playback depend on CineSrc. The host's play, pause, seek and position are broadcast to other viewers through Socket.io.
