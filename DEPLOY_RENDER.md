# Deploying NewMoon to Render.com 🚀

This guide provides step-by-step instructions to deploy your Laravel + React application on **Render.com** using Docker.

---

## 1. Prepare a MySQL Database

Render's built-in managed database is PostgreSQL. Since your Laravel application uses MySQL, you can use a **free cloud MySQL provider**:

### Recommended Free MySQL Providers:
- **[Aiven](https://aiven.io/)** (Free tier available, reliable MySQL 8.0)
- **[Clever Cloud](https://www.clever-cloud.com/)** (Free MySQL addon)
- **[Railway](https://railway.app/)** (One-click MySQL instance)
- **[TiDB Serverless](https://tidbcloud.com/)** (MySQL-compatible, free 5GB)

Once you create your database, note down:
- `DB_HOST` (e.g. `mysql-xxx.aivencloud.com`)
- `DB_PORT` (e.g. `3306` or custom port provided)
- `DB_DATABASE` (e.g. `defaultdb` or `newmoon`)
- `DB_USERNAME` (e.g. `avnadmin`)
- `DB_PASSWORD` (e.g. `your-secret-password`)

---

## 2. Deploy Using Render Blueprint (Recommended - 1 Click)

1. Push your latest code including `render.yaml` and `Backend/Dockerfile` to GitHub:
   ```bash
   git add .
   git commit -m "Add Docker and Render deployment setup"
   git push origin main
   ```
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** > **Blueprint**.
4. Select your GitHub repository (`Newmoon`).
5. Render will automatically detect `render.yaml`.
6. Fill in the database environment variables prompted by Render:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_DATABASE`
   - `DB_USERNAME`
   - `DB_PASSWORD`
7. Click **Apply**. Render will automatically build the Docker image (compiling Vite assets, installing Composer dependencies, and starting Apache).

---

## 3. Alternative: Manual Web Service Setup on Render

If you prefer setting it up manually:

1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Choose **Docker** as the runtime.
4. Set the following settings:
   - **Name**: `newmoon-backend`
   - **Region**: Singapore (or nearest to your users)
   - **Root Directory**: `Backend`
   - **Dockerfile Path**: `Dockerfile`
   - **Instance Type**: Free
5. Scroll down to **Environment Variables** and add:

| Key | Recommended Value | Description |
|---|---|---|
| `APP_NAME` | `NewMoon` | App Name |
| `APP_ENV` | `production` | Production environment |
| `APP_DEBUG` | `false` | Disable debug mode in production |
| `APP_KEY` | *(Generate via `php artisan key:generate --show`)* | 32-character base64 key |
| `APP_URL` | `https://your-app.onrender.com` | Your Render URL |
| `LOG_CHANNEL` | `stderr` | Route logs to Render console |
| `DB_CONNECTION` | `mysql` | MySQL database |
| `DB_HOST` | *(from your cloud MySQL provider)* | Database Host |
| `DB_PORT` | `3306` *(or your cloud port)* | Database Port |
| `DB_DATABASE` | *(your cloud database name)* | Database Name |
| `DB_USERNAME` | *(your cloud username)* | Database Username |
| `DB_PASSWORD` | *(your cloud password)* | Database Password |
| `RUN_MIGRATIONS` | `true` | Automatically runs `php artisan migrate --force` on startup |
| `SESSION_DRIVER` | `database` | Stores user sessions in the database |
| `CACHE_STORE` | `database` | Stores cache in the database |
| `QUEUE_CONNECTION` | `database` | Handles queued jobs in the database |

6. Click **Create Web Service**.

---

## 4. How the Docker Setup Works

- **Stage 1 (Frontend Builder)**: Uses `node:22-alpine` to run `npm run build`, generating the minified React/Vite bundle into `public/build`.
- **Stage 2 (Composer Builder)**: Uses `composer:2` to download and optimize PHP production vendor packages.
- **Stage 3 (Production Apache)**: Uses `php:8.3-apache` with all required PHP extensions (`pdo_mysql`, `gd`, `zip`, `bcmath`, `mbstring`, `intl`, `opcache`).
- **Dynamic Port**: Render assigns a random port through `$PORT` (typically `10000`). The `docker-entrypoint.sh` automatically binds Apache to `$PORT`.
- **Automatic Storage Link & Migrations**: On container startup, `docker-entrypoint.sh` runs `php artisan storage:link --force` and runs database migrations if `RUN_MIGRATIONS=true`.
