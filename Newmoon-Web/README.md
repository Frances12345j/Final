# Newmoon-Web

Standalone React SPA for the NewMoon admin panel. This app was extracted from
the Laravel backend (`Backend/resources/js`) and now runs independently of it —
the backend is API-only.

## Stack

- React 19 + Vite 8
- React Router 7 (`BrowserRouter`)
- Ant Design 6, MUI, Recharts
- Tailwind CSS 4
- TanStack Query, Axios
- Laravel Echo + Pusher (Reverb) for realtime order updates

## Setup

```bash
npm install
cp .env.example .env   # then edit the values
npm run dev            # http://localhost:5173
```

The dev server proxies `/api`, `/broadcasting` and `/storage` to
`DEV_API_TARGET` (default `http://localhost:8000`), so the app can keep calling
relative `/api` paths. Start the Laravel API separately with `php artisan serve`.

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | API base URL. Relative `/api` for dev, full origin in production. | `/api` |
| `VITE_API_ORIGIN` | API origin used to derive the Echo auth endpoint. Falls back to the origin of `VITE_API_BASE_URL`. | derived |
| `VITE_WS_HOST` | Reverb websocket host. | `localhost` |
| `VITE_WS_PORT` | Reverb websocket port. | `8080` |
| `VITE_REVERB_KEY` | Reverb app key. | `newmoon-app-key` |
| `DEV_API_TARGET` | Dev-only proxy target. | `http://localhost:8000` |

Vite only exposes variables prefixed with `VITE_` to the client, so anything in
`VITE_*` is compiled into the bundle at build time. Changing these requires a
rebuild, not just a server restart.

## Build

```bash
npm run build      # output to dist/
npm run preview    # serve dist/ locally
```

## Deployment notes

Because routing uses `BrowserRouter`, the host must rewrite unknown paths to
`index.html` (SPA fallback) — otherwise a hard refresh on `/dashboard` or
`/sales-record` 404s. Add a catch-all rewrite for everything except `/api/*`,
`/assets/*` and static files.

Serve `dist/` over HTTPS and point the API at the backend over HTTPS as well,
otherwise the browser will block mixed-content requests.
