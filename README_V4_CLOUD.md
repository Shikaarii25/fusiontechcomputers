# Fusiontech Cloud Edition V4

Separate cloud-native edition of Fusiontech. The existing Windows/XAMPP V3 application is NOT modified by this package.

## Architecture

- Static HTML/CSS/JavaScript frontend on Netlify
- Netlify Functions API (`/api/*`)
- PostgreSQL through Netlify Database (`NETLIFY_DB_URL`) or another Postgres URL (`DATABASE_URL`)
- Netlify Blobs for persistent image uploads
- Server-side admin session cookie + CSRF protection

Netlify Database is a managed Postgres service integrated with Netlify. Netlify Functions can read server-only environment variables at runtime, so database credentials and secrets do not go to the browser.

## Deploy to Netlify

1. Unzip this project.
2. Put the project in a new GitHub repository, for example `fusiontech-cloud-v4`.
3. In Netlify choose **Add new project → Import an existing project**, select GitHub, and choose the new repository.
4. Publish directory: `.`. No framework is required. The included `netlify.toml` configures the Functions directory and `/api/*` routing.
5. Create the Netlify Database from **Project configuration / Data & Storage → Database**. Netlify Database uses Postgres. If your plan does not provide Netlify Database, set `DATABASE_URL` to another managed Postgres database instead.
6. In **Project configuration → Environment variables**, add:
   - `ADMIN_EMAIL` — your admin email.
   - `ADMIN_PASSWORD` — a temporary bootstrap password (10+ characters recommended).
   - `SESSION_SECRET` — a long random secret. On Windows with Node installed, run: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `DATABASE_URL` is optional when Netlify Database is enabled; the app prefers `NETLIFY_DB_URL` automatically.
7. Deploy/redeploy the project.
8. Open the Netlify URL. The first successful login using `ADMIN_EMAIL` + `ADMIN_PASSWORD` creates the server-side admin record in Postgres.
9. Click the Fusiontech `FT` mark 10 times on the public site to open the hidden admin shortcut, or open `/admin.html` directly.
10. In Admin → Settings, save your business details and upload the hero image.
11. In Admin → Services / Products / Gallery, upload your own images. These are stored in Netlify Blobs, not the deployed website filesystem.
12. Change the admin password from Admin → Account after the first login.

## Important

- V3 remains separate. Do not copy the V4 database connection settings into V3.
- V4 starts with a clean cloud database seeded with default site settings and default services. Existing V3 MariaDB records are not automatically copied because V4 uses PostgreSQL.
- Do not expose MySQL/MariaDB port 3306. V4 needs only HTTPS access to the Netlify APIs.
- Do not commit `.env` files or secret values to GitHub.

## Local development

Install Node.js 20+ and Netlify CLI 26+.

```bash
npm install -g netlify-cli
npm install
netlify dev
```

Use `DATABASE_URL` for a development Postgres database if you want to test locally. Never point local experiments at a production database unless you have a backup and intend to do so.

## V3 migration

V3 uses MariaDB and V4 uses PostgreSQL. Export/import should be treated as a controlled migration, not a direct copy of the MariaDB data directory. See `migration/README_V3_MIGRATION.md`.
